import { Node } from "./Node.ts";
import { RoutingTable } from "../network/RoutingTable.ts";

export class Router extends Node {
  hostname: string;
  routingTable: RoutingTable;

  constructor(id: string, hostname: string, x: number, y: number) {
    super(id, { x, y });
    this.hostname = hostname;
    this.routingTable = new RoutingTable();
  }
}
