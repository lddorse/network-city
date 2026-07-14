import type { CSSProperties, ReactNode } from "react";
import type { Building, Link, NetworkInterface, Node, Router } from "@network-city/simulation-engine";
import { describeEndpoint } from "./deviceLabels";

export type Selection =
  | { kind: "building"; entity: Building }
  | { kind: "router"; entity: Router }
  | { kind: "link"; entity: Link };

interface InspectorProps {
  selection: Selection | undefined;
  links: Link[];
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

export default function Inspector({ selection, links }: InspectorProps) {
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
          <ConnectedLinks node={router} links={links} />
        </Field>
        <Field label="interfaces">
          <InterfaceList interfaces={router.interfaces} links={links} />
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
      <Field label="from">{describeEndpoint(link.endpointA)}</Field>
      <Field label="to">{describeEndpoint(link.endpointB)}</Field>
      <Field label="status">{link.status}</Field>
      <Field label="cost">{link.cost}</Field>
    </aside>
  );
}
