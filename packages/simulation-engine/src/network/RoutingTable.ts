import type { Route } from "./Route";

// Owned by a Router. Entirely derived state — RoutingTableSystem is the
// only writer. The renderer and any future CLI must only read `routes`,
// never push entries into it directly.
export class RoutingTable {
  routes: Route[] = [];
}
