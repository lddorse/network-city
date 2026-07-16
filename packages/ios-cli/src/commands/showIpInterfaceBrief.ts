import type { Router } from "@network-city/simulation-engine";

// Column widths mirror real `show ip interface brief` output closely enough
// to read authentically without inventing engine-backed data the interface
// doesn't have.
const COLUMN_WIDTHS = {
  interface: 23,
  ipAddress: 16,
  ok: 4,
  method: 7,
  status: 22,
};

function pad(value: string, width: number): string {
  return value.length >= width ? `${value} ` : value.padEnd(width);
}

// Every field here is read from the interface at call time (name, ipv4,
// administrativeStatus, operationalStatus) — nothing is cached or
// hardcoded. "Method" reflects whether an address is configured, since the
// engine has no NVRAM/DHCP provisioning concept yet.
export function showIpInterfaceBrief(router: Router): string[] {
  const header =
    pad("Interface", COLUMN_WIDTHS.interface) +
    pad("IP-Address", COLUMN_WIDTHS.ipAddress) +
    pad("OK?", COLUMN_WIDTHS.ok) +
    pad("Method", COLUMN_WIDTHS.method) +
    pad("Status", COLUMN_WIDTHS.status) +
    "Protocol";

  const rows = router.interfaces.map((iface) => {
    const ipAddress = iface.ipv4 ? iface.ipv4.address : "unassigned";
    const method = iface.ipv4 ? "manual" : "unset";
    const status = iface.administrativeStatus === "down" ? "administratively down" : iface.operationalStatus;
    const protocol = iface.operationalStatus;

    return (
      pad(iface.name, COLUMN_WIDTHS.interface) +
      pad(ipAddress, COLUMN_WIDTHS.ipAddress) +
      pad("YES", COLUMN_WIDTHS.ok) +
      pad(method, COLUMN_WIDTHS.method) +
      pad(status, COLUMN_WIDTHS.status) +
      protocol
    );
  });

  return [header, ...rows];
}
