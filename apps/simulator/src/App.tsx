import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Rectangle, Text, type Ticker } from "pixi.js";
import { World } from "@network-city/simulation-engine";
import type {
  Building,
  Link,
  LinkStatus,
  NetworkInterface,
  Router,
  Vector2,
} from "@network-city/simulation-engine";
import Inspector, { type Selection } from "./Inspector";
import InterfaceTooltip from "./InterfaceTooltip";
import Terminal from "./Terminal";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 640;

const ROUTER_RADIUS = 34;
const ROUTER_COLOR = 0x345995;
const LINK_COLOR = 0x82d8ff;
const LINK_COLOR_DOWN = 0x8a6a6a; // muted gray/red, distinct from the brighter LED down/degraded colors
const LINK_WIDTH = 6;

const VEHICLE_RADIUS = 10;
const VEHICLE_COLOR = 0xffa500;

const BUILDING_CORNER_RADIUS = 8;

const SELECTION_OUTLINE_COLOR = 0xffff00;
const SELECTION_OUTLINE_WIDTH = 4;

const INTERFACE_LABEL_OFFSET = 50;
const INTERFACE_LABEL_COLOR = 0xf8f8f8;
const INTERFACE_LABEL_FONT_SIZE = 12;
const INTERFACE_LABEL_PADDING = 3;
const INTERFACE_LABEL_CORNER_RADIUS = 4;
const INTERFACE_LABEL_BACKGROUND_COLOR = 0x232328; // rgb(35, 35, 40)
const INTERFACE_LABEL_BACKGROUND_ALPHA = 0.95;
const INTERFACE_LABEL_BORDER_COLOR = 0xffffff;
const INTERFACE_LABEL_BORDER_ALPHA = 0.08;
const INTERFACE_LABEL_BORDER_WIDTH = 1;
// Extra hit-area beyond the visible background, so hovering doesn't require
// pixel-perfect mouse positioning on the small label itself.
const INTERFACE_LABEL_HOVER_PADDING = 8;

const INTERFACE_LED_RADIUS = 3;
const INTERFACE_LED_GAP = 4; // gap between the LED and the label background
const INTERFACE_LED_COLOR_UP = 0x22c55e;
const INTERFACE_LED_COLOR_DEGRADED = 0xeab308;
const INTERFACE_LED_COLOR_DOWN = 0xef4444;
const INTERFACE_LED_COLOR_UNCONNECTED = 0x9ca3af;

function drawInterfaceLed(graphic: Graphics, color: number): void {
  graphic.clear();
  graphic.circle(0, 0, INTERFACE_LED_RADIUS);
  graphic.fill(color);
}

// Connectivity takes priority: an unplugged interface reads as gray
// regardless of what its admin/oper flags happen to say.
function interfaceStatusColor(iface: NetworkInterface, links: Link[]): number {
  const isConnected = links.some((link) => link.endpointA === iface || link.endpointB === iface);

  if (!isConnected) {
    return INTERFACE_LED_COLOR_UNCONNECTED;
  }

  if (iface.administrativeStatus === "down") {
    return INTERFACE_LED_COLOR_DOWN;
  }

  if (iface.operationalStatus === "down") {
    return INTERFACE_LED_COLOR_DEGRADED;
  }

  return INTERFACE_LED_COLOR_UP;
}

// Building fill colors are a rendering choice, not simulation state, so they
// are keyed off the World's building ids here rather than living on Building.
const BUILDING_COLORS: Record<string, number> = {
  house: 0xd8c3a5,
  hospital: 0xc9d8e6,
};

function drawBuilding(graphic: Graphics, building: Building, selected: boolean): void {
  graphic.clear();
  graphic.roundRect(
    building.position.x,
    building.position.y,
    building.width,
    building.height,
    BUILDING_CORNER_RADIUS
  );
  graphic.fill(BUILDING_COLORS[building.id] ?? 0xffffff);

  if (selected) {
    graphic.roundRect(
      building.position.x,
      building.position.y,
      building.width,
      building.height,
      BUILDING_CORNER_RADIUS
    );
    graphic.stroke({ width: SELECTION_OUTLINE_WIDTH, color: SELECTION_OUTLINE_COLOR });
  }
}

function drawRouter(graphic: Graphics, router: Router, selected: boolean): void {
  graphic.clear();
  graphic.circle(router.position.x, router.position.y, ROUTER_RADIUS);
  graphic.fill(ROUTER_COLOR);

  if (selected) {
    graphic.circle(router.position.x, router.position.y, ROUTER_RADIUS);
    graphic.stroke({ width: SELECTION_OUTLINE_WIDTH, color: SELECTION_OUTLINE_COLOR });
  }
}

// A point `distance` units from `from`, along the direction toward `towards`.
// Used to place an interface label just outside its owning node, regardless
// of that node's shape or the link's angle (no per-device coordinates).
function offsetPosition(from: Vector2, towards: Vector2, distance: number): Vector2 {
  const dx = towards.x - from.x;
  const dy = towards.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return { ...from };
  }

  return {
    x: from.x + (dx / length) * distance,
    y: from.y + (dy / length) * distance,
  };
}

function drawLink(graphic: Graphics, link: Link, selected: boolean): void {
  const from = link.endpointA.owner.connectionPoint;
  const to = link.endpointB.owner.connectionPoint;
  const color = link.status === "down" ? LINK_COLOR_DOWN : LINK_COLOR;

  graphic.clear();
  graphic.moveTo(from.x, from.y);
  graphic.lineTo(to.x, to.y);
  graphic.stroke({ width: LINK_WIDTH, color });

  if (selected) {
    graphic.moveTo(from.x, from.y);
    graphic.lineTo(to.x, to.y);
    graphic.stroke({ width: SELECTION_OUTLINE_WIDTH, color: SELECTION_OUTLINE_COLOR });
  }
}

// A cheap, stable string summarizing a router's current routing table, so a
// ticker callback can detect "did this actually change" without diffing
// route objects or copying route data anywhere.
function routingTableSignature(router: Router): string {
  return router.routingTable.routes
    .map((route) => `${route.type}|${route.destination}|${route.prefixLength}|${route.outgoingInterfaceId}`)
    .join(";");
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | undefined>(undefined);
  const buildingGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const routerGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const linkGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const interfaceLedGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const [selection, setSelection] = useState<Selection | undefined>(undefined);
  // Mirrors world.links for the Inspector prop below; render must not read
  // worldRef.current directly, so this is set once when World is created.
  const [links, setLinks] = useState<Link[]>([]);
  const [hover, setHover] = useState<{ iface: NetworkInterface; x: number; y: number } | undefined>(
    undefined
  );
  // Tracks the currently selected router (if any) for the persistent
  // handleTick closure below, which is created once at mount and would
  // otherwise only ever see the initial `selection` value.
  const selectedRouterRef = useRef<Router | undefined>(undefined);
  // The selected router's routing-table signature as of the last tick that
  // triggered a rerender, so handleTick can tell whether anything actually
  // changed instead of rerendering every frame. Reset whenever selection
  // changes (see the effect below).
  const lastRoutingTableSignatureRef = useRef<string | undefined>(undefined);
  // Unused value: its setter is called only when the selected router's
  // routing table signature changes, purely to force Inspector to
  // re-render and re-read the live `router.routingTable.routes` — no
  // routing data is copied into state.
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const host = containerRef.current;

    if (!host) {
      return;
    }

    const world = new World();
    worldRef.current = world;
    setLinks(world.links);

    const app = new Application();
    let cancelled = false;
    let initialized = false;
    let unsubscribeArrival: (() => void) | undefined;
    let unsubscribeBlocked: (() => void) | undefined;

    const startPixi = async () => {
      await app.init({
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        background: "#7dbb6a",
        antialias: true,
      });

      initialized = true;

      // React may have already cleaned up this effect while Pixi was initializing.
      if (cancelled) {
        app.destroy(true, {
          children: true,
          texture: true,
          textureSource: true,
        });
        return;
      }

      host.appendChild(app.canvas);

      // Clicking empty canvas (not caught by an entity below) clears selection.
      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      app.stage.on("pointertap", () => {
        setSelection(undefined);
      });

      const background = new Graphics();

      // Main road
      background.rect(0, 265, WORLD_WIDTH, 110);
      background.fill(0x555555);

      // Center line
      background.rect(0, 316, WORLD_WIDTH, 8);
      background.fill(0xf2d95c);

      app.stage.addChild(background);

      // Links are added before buildings/routers so those shapes paint over
      // a link's endpoints, giving the same "line stops at the node" look
      // as before without hardcoding per-node-type trim math.
      const linkGraphics = new Map<string, Graphics>();

      for (const link of world.links) {
        const graphic = new Graphics();
        drawLink(graphic, link, false);
        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        graphic.on("pointertap", (event) => {
          event.stopPropagation();
          setSelection({ kind: "link", entity: link });
        });
        app.stage.addChild(graphic);
        linkGraphics.set(link.id, graphic);
      }

      const buildingGraphics = new Map<string, Graphics>();

      for (const building of world.buildings) {
        const graphic = new Graphics();
        drawBuilding(graphic, building, false);
        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        graphic.on("pointertap", (event) => {
          event.stopPropagation();
          setSelection({ kind: "building", entity: building });
        });
        app.stage.addChild(graphic);
        buildingGraphics.set(building.id, graphic);
      }

      const routerGraphics = new Map<string, Graphics>();

      for (const router of world.routers) {
        const graphic = new Graphics();
        drawRouter(graphic, router, false);
        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        graphic.on("pointertap", (event) => {
          event.stopPropagation();
          setSelection({ kind: "router", entity: router });
        });
        app.stage.addChild(graphic);
        routerGraphics.set(router.id, graphic);
      }

      linkGraphicsRef.current = linkGraphics;
      buildingGraphicsRef.current = buildingGraphics;
      routerGraphicsRef.current = routerGraphics;

      const title = new Text({
        text: "Network City",
        style: {
          fill: 0xffffff,
          fontSize: 24,
          fontWeight: "bold",
        },
      });

      title.position.set(20, 20);
      app.stage.addChild(title);

      for (const router of world.routers) {
        const label = new Text({
          text: router.hostname,
          style: {
            fill: 0xffffff,
            fontSize: 18,
          },
        });

        label.anchor.set(0.5);
        label.position.set(router.position.x, router.position.y);
        app.stage.addChild(label);
      }

      const interfaceLedGraphics = new Map<string, Graphics>();

      // A compact, hoverable label per link endpoint, positioned away from
      // its owning node along the link's own direction (so it reads well on
      // both the horizontal R1<->R2 link and the diagonal building links).
      const addInterfaceLabel = (iface: NetworkInterface, position: Vector2) => {
        // A second line is only added when an address is actually assigned,
        // so an unconfigured interface keeps today's single-line label.
        const labelText = iface.ipv4 ? `${iface.name}\n${iface.ipv4.toCidr()}` : iface.name;

        const text = new Text({
          text: labelText,
          style: {
            fill: INTERFACE_LABEL_COLOR,
            fontSize: INTERFACE_LABEL_FONT_SIZE,
            align: "center",
          },
        });
        text.anchor.set(0.5);

        const backgroundWidth = text.width + INTERFACE_LABEL_PADDING * 2;
        const backgroundHeight = text.height + INTERFACE_LABEL_PADDING * 2;

        const background = new Graphics();
        background.roundRect(
          -backgroundWidth / 2,
          -backgroundHeight / 2,
          backgroundWidth,
          backgroundHeight,
          INTERFACE_LABEL_CORNER_RADIUS
        );
        background.fill({
          color: INTERFACE_LABEL_BACKGROUND_COLOR,
          alpha: INTERFACE_LABEL_BACKGROUND_ALPHA,
        });
        background.roundRect(
          -backgroundWidth / 2,
          -backgroundHeight / 2,
          backgroundWidth,
          backgroundHeight,
          INTERFACE_LABEL_CORNER_RADIUS
        );
        background.stroke({
          width: INTERFACE_LABEL_BORDER_WIDTH,
          color: INTERFACE_LABEL_BORDER_COLOR,
          alpha: INTERFACE_LABEL_BORDER_ALPHA,
        });

        // Sits outside the label background so it never resizes it; purely
        // visual, not part of the (unchanged) hover hit area below. Drawn in
        // its own local space (0, 0) so redrawing it on status changes never
        // needs to know the label's offset math.
        const led = new Graphics();
        led.position.set(-backgroundWidth / 2 - INTERFACE_LED_GAP - INTERFACE_LED_RADIUS, 0);
        drawInterfaceLed(led, interfaceStatusColor(iface, world.links));
        interfaceLedGraphics.set(iface.id, led);

        const container = new Container();
        container.position.set(position.x, position.y);
        container.addChild(background, led, text);

        // Hit area is larger than the visible background so hovering is
        // forgiving, while the label itself stays the same visible size.
        container.eventMode = "static";
        container.cursor = "pointer";
        container.hitArea = new Rectangle(
          -backgroundWidth / 2 - INTERFACE_LABEL_HOVER_PADDING,
          -backgroundHeight / 2 - INTERFACE_LABEL_HOVER_PADDING,
          backgroundWidth + INTERFACE_LABEL_HOVER_PADDING * 2,
          backgroundHeight + INTERFACE_LABEL_HOVER_PADDING * 2
        );
        container.on("pointerover", (event) => {
          setHover({ iface, x: event.clientX, y: event.clientY });
        });
        container.on("pointerout", () => {
          setHover(undefined);
        });

        app.stage.addChild(container);
      };

      for (const link of world.links) {
        const pointA = link.endpointA.owner.connectionPoint;
        const pointB = link.endpointB.owner.connectionPoint;

        addInterfaceLabel(link.endpointA, offsetPosition(pointA, pointB, INTERFACE_LABEL_OFFSET));
        addInterfaceLabel(link.endpointB, offsetPosition(pointB, pointA, INTERFACE_LABEL_OFFSET));
      }

      interfaceLedGraphicsRef.current = interfaceLedGraphics;

      const vehicleGraphics = new Map<string, Graphics>();

      for (const vehicle of world.vehicles) {
        const graphic = new Graphics();
        graphic.circle(0, 0, VEHICLE_RADIUS);
        graphic.fill(VEHICLE_COLOR);
        graphic.position.set(vehicle.position.x, vehicle.position.y);
        app.stage.addChild(graphic);
        vehicleGraphics.set(vehicle.id, graphic);
      }

      unsubscribeArrival = world.movementSystem.onArrival.on(({ vehicleId }) => {
        console.log(`Delivery arrived: ${vehicleId}`);
      });

      unsubscribeBlocked = world.deliverySystem.onBlocked.on(
        ({ vehicleId, blockedLinkId, currentNodeId }) => {
          console.log(
            `Delivery blocked: ${vehicleId} at ${currentNodeId}, link ${blockedLinkId} is down`
          );
        }
      );

      const handleTick = (ticker: Ticker) => {
        world.update(ticker.deltaMS / 1000);

        // The routing table is derived every tick in the engine, but the
        // 60 FPS ticker shouldn't drive React rendering by itself — only
        // force Inspector to re-render when the selected router's routing
        // table actually changed since the last time we checked.
        const selectedRouter = selectedRouterRef.current;

        if (selectedRouter) {
          const signature = routingTableSignature(selectedRouter);

          if (signature !== lastRoutingTableSignatureRef.current) {
            lastRoutingTableSignatureRef.current = signature;
            forceRerender((n) => n + 1);
          }
        }

        for (const link of world.links) {
          for (const iface of [link.endpointA, link.endpointB]) {
            const graphic = interfaceLedGraphicsRef.current.get(iface.id);

            if (graphic) {
              drawInterfaceLed(graphic, interfaceStatusColor(iface, world.links));
            }
          }
        }

        const activeVehicleIds = new Set(world.vehicles.map((vehicle) => vehicle.id));

        for (const [vehicleId, graphic] of vehicleGraphics) {
          if (!activeVehicleIds.has(vehicleId)) {
            graphic.destroy();
            vehicleGraphics.delete(vehicleId);
          }
        }

        for (const vehicle of world.vehicles) {
          let graphic = vehicleGraphics.get(vehicle.id);

          if (!graphic) {
            graphic = new Graphics();
            graphic.circle(0, 0, VEHICLE_RADIUS);
            graphic.fill(VEHICLE_COLOR);
            app.stage.addChild(graphic);
            vehicleGraphics.set(vehicle.id, graphic);
          }

          graphic.position.set(vehicle.position.x, vehicle.position.y);
        }
      };

      app.ticker.add(handleTick);
    };

    startPixi().catch((error: unknown) => {
      console.error("Failed to initialize Network City:", error);
    });

    return () => {
      cancelled = true;
      unsubscribeArrival?.();
      unsubscribeBlocked?.();

      if (!initialized) {
        return;
      }

      if (app.canvas.parentNode === host) {
        host.removeChild(app.canvas);
      }

      app.destroy(true, {
        children: true,
        texture: true,
        textureSource: true,
      });
    };
  }, []);

  // Redraws only the shapes whose selected state changed, without touching
  // the one-time Pixi setup above or the running delivery animation.
  useEffect(() => {
    selectedRouterRef.current = selection?.kind === "router" ? selection.entity : undefined;
    // A different (or no) selection invalidates whatever signature was
    // last observed, so the next tick always re-checks from scratch.
    lastRoutingTableSignatureRef.current = undefined;

    const world = worldRef.current;

    if (!world) {
      return;
    }

    for (const building of world.buildings) {
      const graphic = buildingGraphicsRef.current.get(building.id);

      if (graphic) {
        drawBuilding(graphic, building, selection?.kind === "building" && selection.entity === building);
      }
    }

    for (const router of world.routers) {
      const graphic = routerGraphicsRef.current.get(router.id);

      if (graphic) {
        drawRouter(graphic, router, selection?.kind === "router" && selection.entity === router);
      }
    }

    for (const link of world.links) {
      const graphic = linkGraphicsRef.current.get(link.id);

      if (graphic) {
        drawLink(graphic, link, selection?.kind === "link" && selection.entity === link);
      }
    }
  }, [selection]);

  // Temporary developer control (see Inspector's Link status buttons) for
  // exercising link failure before a CLI exists. Mutates the World directly,
  // then bumps selection so Inspector's text re-renders; the link's line
  // color picks up the change via the effect above.
  const handleSetLinkStatus = (link: Link, status: LinkStatus) => {
    link.status = status;
    setSelection((current) =>
      current?.kind === "link" && current.entity === link ? { ...current } : current
    );
  };

  const selectedRouter = selection?.kind === "router" ? selection.entity : undefined;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111827",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "white", marginTop: 0 }}>Network City</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div ref={containerRef} />
        <Inspector selection={selection} links={links} onSetLinkStatus={handleSetLinkStatus} />
        <Terminal router={selectedRouter} />
      </div>
      {hover && <InterfaceTooltip iface={hover.iface} links={links} x={hover.x} y={hover.y} />}
    </main>
  );
}
