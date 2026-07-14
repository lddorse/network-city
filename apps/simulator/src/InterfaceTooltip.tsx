import type { CSSProperties } from "react";
import type { Link, NetworkInterface } from "@network-city/simulation-engine";
import { deviceName, describeEndpoint } from "./deviceLabels";

interface InterfaceTooltipProps {
  iface: NetworkInterface;
  links: Link[];
  x: number;
  y: number;
}

const tooltipStyle: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  background: "#111827",
  color: "white",
  border: "1px solid #374151",
  borderRadius: 6,
  padding: "8px 10px",
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  lineHeight: 1.6,
  zIndex: 10,
  whiteSpace: "nowrap",
};

export default function InterfaceTooltip({ iface, links, x, y }: InterfaceTooltipProps) {
  const connectedLink = links.find((link) => link.endpointA === iface || link.endpointB === iface);
  const peer = connectedLink
    ? connectedLink.endpointA === iface
      ? connectedLink.endpointB
      : connectedLink.endpointA
    : undefined;

  return (
    <div style={{ ...tooltipStyle, left: x + 12, top: y + 12 }}>
      <div>
        <strong>{deviceName(iface.owner)}</strong> {iface.name}
      </div>
      <div>id: {iface.id}</div>
      <div>
        admin: {iface.administrativeStatus} / oper: {iface.operationalStatus}
      </div>
      <div>link: {connectedLink ? connectedLink.id : "Not connected"}</div>
      <div>peer: {peer ? describeEndpoint(peer) : "None"}</div>
    </div>
  );
}
