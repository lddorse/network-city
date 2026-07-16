import type { Router, RouteType } from "@network-city/simulation-engine";

// Mirrors apps/simulator's Inspector route-line convention (see
// deviceLabels.ts) so both surfaces agree on how route types are coded.
const ROUTE_TYPE_CODE: Record<RouteType, string> = {
  Connected: "C",
  Local: "L",
};

// Always true today: the engine has no static/default-route concept yet, so
// a default route can never appear in a RoutingTable. Computed rather than
// hardcoded so this stays correct once static routes exist.
function hasDefaultRoute(router: Router): boolean {
  return router.routingTable.routes.some(
    (route) => route.destination === "0.0.0.0" && route.prefixLength === 0
  );
}

// Generated entirely from router.routingTable.routes and router.interfaces —
// no route data is invented or duplicated here.
export function showIpRoute(router: Router): string[] {
  const codesLegend = `Codes: ${Object.entries(ROUTE_TYPE_CODE)
    .map(([type, code]) => `${code} - ${type.toLowerCase()}`)
    .join(", ")}`;

  const gatewayLine = hasDefaultRoute(router)
    ? "Gateway of last resort is set"
    : "Gateway of last resort is not set";

  const routeLines = router.routingTable.routes.map((route) => {
    const outgoingInterface = router.interfaces.find((iface) => iface.id === route.outgoingInterfaceId);
    const interfaceName = outgoingInterface?.name ?? route.outgoingInterfaceId;

    return `${ROUTE_TYPE_CODE[route.type]} ${route.destination}/${route.prefixLength} is directly connected, ${interfaceName}`;
  });

  return [codesLegend, "", gatewayLine, "", ...routeLines];
}
