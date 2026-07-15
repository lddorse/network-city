import type { CSSProperties, ReactNode } from "react";
import type {
  Building,
  Link,
  LinkStatus,
  NetworkInterface,
  Node,
  Router,
} from "@network-city/simulation-engine";
import {
  describeEndpoint,
  formatIPv4Cidr,
  formatRouteLine,
  subnetCompatibility,
  subnetDetails,
} from "./deviceLabels";

export type Selection =
  | { kind: "building"; entity: Building }
  | { kind: "router"; entity: Router }
  | { kind: "link"; entity: Link };

interface InspectorProps {
  selection: Selection | undefined;
  links: Link[];
  onSetLinkStatus: (link: Link, status: LinkStatus) => void;
}

const panelStyle: CSSProperties = {
  width: 260,
  flexShrink: 0,
  padding: 16,
  color: "white",
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  background: "#1f2937",
  borderRadius: 8,
};

function formatPosition(position: { x: number; y: number }): string {
  return `(${Math.round(position.x)}, ${Math.round(position.y)})`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SubnetInfo({ iface }: { iface: NetworkInterface }) {
  const subnet = subnetDetails(iface);

  if (!subnet) {
    return null;
  }

  return (
    <>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>network: {subnet.network}</div>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>broadcast: {subnet.broadcast}</div>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>mask: {subnet.mask}</div>
    </>
  );
}

function InterfaceList({ interfaces, links }: { interfaces: NetworkInterface[]; links: Link[] }) {
  if (interfaces.length === 0) {
    return <div>None</div>;
  }

  return (
    <div>
      {interfaces.map((iface) => {
        const connectedLink = links.find(
          (link) => link.endpointA === iface || link.endpointB === iface
        );

        return (
          <div
            key={iface.id}
            style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #374151" }}
          >
            <div>{iface.name}</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>id: {iface.id}</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>ipv4: {formatIPv4Cidr(iface)}</div>
            <SubnetInfo iface={iface} />
            <div style={{ color: "#9ca3af", fontSize: 12 }}>
              admin: {iface.administrativeStatus} / oper: {iface.operationalStatus}
            </div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>
              link: {connectedLink ? connectedLink.id : "Not connected"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EndpointDetail({ iface }: { iface: NetworkInterface }) {
  return (
    <div>
      <div>{describeEndpoint(iface)}</div>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>{formatIPv4Cidr(iface)}</div>
    </div>
  );
}

function ConnectedLinks({ node, links }: { node: Node; links: Link[] }) {
  const connected = links.filter(
    (link) => link.endpointA.owner === node || link.endpointB.owner === node
  );

  if (connected.length === 0) {
    return <div>None</div>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {connected.map((link) => (
        <li key={link.id}>{link.id}</li>
      ))}
    </ul>
  );
}

const devButtonStyle = (active: boolean): CSSProperties => ({
  padding: "4px 10px",
  fontSize: 12,
  borderRadius: 4,
  border: "1px solid #374151",
  background: active ? "#374151" : "#111827",
  color: active ? "#6b7280" : "white",
  cursor: active ? "default" : "pointer",
});

// Router-only: unlike the plain id list in ConnectedLinks, this shows enough
// per-link detail (and the same temporary Up/Down control as the Link
// Inspector) to exercise link failure without leaving the Router panel —
// e.g. to watch its routing table live-update as a link goes down/up.
function RouterConnectedLinks({
  router,
  links,
  onSetLinkStatus,
}: {
  router: Router;
  links: Link[];
  onSetLinkStatus: (link: Link, status: LinkStatus) => void;
}) {
  const connected = links.filter(
    (link) => link.endpointA.owner === router || link.endpointB.owner === router
  );

  if (connected.length === 0) {
    return <div>None</div>;
  }

  return (
    <div>
      {connected.map((link) => {
        const isEndpointA = link.endpointA.owner === router;
        const localIface = isEndpointA ? link.endpointA : link.endpointB;
        const peerIface = isEndpointA ? link.endpointB : link.endpointA;

        return (
          <div
            key={link.id}
            style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #374151" }}
          >
            <div>{link.id}</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>local: {localIface.name}</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>peer: {describeEndpoint(peerIface)}</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>status: {link.status}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                style={devButtonStyle(link.status === "up")}
                disabled={link.status === "up"}
                onClick={() => onSetLinkStatus(link, "up")}
              >
                Up
              </button>
              <button
                type="button"
                style={devButtonStyle(link.status === "down")}
                disabled={link.status === "down"}
                onClick={() => onSetLinkStatus(link, "down")}
              >
                Down
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoutingTableView({ router }: { router: Router }) {
  const { routes } = router.routingTable;

  if (routes.length === 0) {
    return <div>None</div>;
  }

  return (
    <div style={{ fontFamily: "monospace", fontSize: 12 }}>
      {routes.map((route, index) => (
        <div key={index}>{formatRouteLine(route, router)}</div>
      ))}
    </div>
  );
}

export default function Inspector({ selection, links, onSetLinkStatus }: InspectorProps) {
  if (!selection) {
    return (
      <aside style={panelStyle}>
        <p style={{ margin: 0, color: "#9ca3af" }}>
          Select a building, router, or link to inspect it.
        </p>
      </aside>
    );
  }

  if (selection.kind === "building") {
    const building = selection.entity;

    return (
      <aside style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{building.name}</h2>
        <Field label="id">{building.id}</Field>
        <Field label="type">Building</Field>
        <Field label="position">{formatPosition(building.position)}</Field>
        <Field label="connected links">
          <ConnectedLinks node={building} links={links} />
        </Field>
        <Field label="interfaces">
          <InterfaceList interfaces={building.interfaces} links={links} />
        </Field>
      </aside>
    );
  }

  if (selection.kind === "router") {
    const router = selection.entity;

    return (
      <aside style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{router.hostname}</h2>
        <Field label="id">{router.id}</Field>
        <Field label="type">Router</Field>
        <Field label="position">{formatPosition(router.position)}</Field>
        <Field label="connected links">
          <RouterConnectedLinks router={router} links={links} onSetLinkStatus={onSetLinkStatus} />
        </Field>
        <Field label="interfaces">
          <InterfaceList interfaces={router.interfaces} links={links} />
        </Field>
        <Field label="routing table">
          <RoutingTableView router={router} />
        </Field>
      </aside>
    );
  }

  const link = selection.entity;

  return (
    <aside style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>{link.id}</h2>
      <Field label="id">{link.id}</Field>
      <Field label="type">Link</Field>
      <Field label="from">
        <EndpointDetail iface={link.endpointA} />
      </Field>
      <Field label="to">
        <EndpointDetail iface={link.endpointB} />
      </Field>
      <Field label="status">{link.status}</Field>
      <Field label="cost">{link.cost}</Field>
      <Field label="subnet compatibility">{subnetCompatibility(link)}</Field>
      {/* Temporary developer control for the Link Failure milestone; not a
          product feature, only exists so link status can be exercised
          before a CLI can set it. */}
      <Field label="dev: status">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={devButtonStyle(link.status === "up")}
            disabled={link.status === "up"}
            onClick={() => onSetLinkStatus(link, "up")}
          >
            Up
          </button>
          <button
            type="button"
            style={devButtonStyle(link.status === "down")}
            disabled={link.status === "down"}
            onClick={() => onSetLinkStatus(link, "down")}
          >
            Down
          </button>
        </div>
      </Field>
    </aside>
  );
}
