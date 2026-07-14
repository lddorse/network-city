import { useEffect, useRef } from "react";
import { Application, Graphics, Text, type Ticker } from "pixi.js";
import { World } from "@network-city/simulation-engine";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 640;

const ROUTER_RADIUS = 34;
const ROUTER_COLOR = 0x345995;
const LINK_COLOR = 0x82d8ff;
const LINK_WIDTH = 6;

const VEHICLE_RADIUS = 10;
const VEHICLE_COLOR = 0xffa500;

const BUILDING_CORNER_RADIUS = 8;

// Building fill colors are a rendering choice, not simulation state, so they
// are keyed off the World's building ids here rather than living on Building.
const BUILDING_COLORS: Record<string, number> = {
  house: 0xd8c3a5,
  hospital: 0xc9d8e6,
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = containerRef.current;

    if (!host) {
      return;
    }

    const world = new World();
    const app = new Application();
    let cancelled = false;
    let initialized = false;
    let unsubscribeArrival: (() => void) | undefined;

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

      const scene = new Graphics();

      // Main road
      scene.rect(0, 265, WORLD_WIDTH, 110);
      scene.fill(0x555555);

      // Center line
      scene.rect(0, 316, WORLD_WIDTH, 8);
      scene.fill(0xf2d95c);

      // Drawn before buildings/routers so their shapes paint over a link's
      // endpoints, giving the same "line stops at the node" look as before
      // without hardcoding per-node-type trim math.
      for (const link of world.links) {
        scene.moveTo(link.from.connectionPoint.x, link.from.connectionPoint.y);
        scene.lineTo(link.to.connectionPoint.x, link.to.connectionPoint.y);
        scene.stroke({
          width: LINK_WIDTH,
          color: LINK_COLOR,
        });
      }

      for (const building of world.buildings) {
        scene.roundRect(
          building.position.x,
          building.position.y,
          building.width,
          building.height,
          BUILDING_CORNER_RADIUS
        );
        scene.fill(BUILDING_COLORS[building.id] ?? 0xffffff);
      }

      for (const router of world.routers) {
        scene.circle(router.position.x, router.position.y, ROUTER_RADIUS);
        scene.fill(ROUTER_COLOR);
      }

      app.stage.addChild(scene);

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

      const handleTick = (ticker: Ticker) => {
        world.update(ticker.deltaMS / 1000);

        for (const vehicle of world.vehicles) {
          vehicleGraphics.get(vehicle.id)?.position.set(vehicle.position.x, vehicle.position.y);
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
      <div ref={containerRef} />
    </main>
  );
}
