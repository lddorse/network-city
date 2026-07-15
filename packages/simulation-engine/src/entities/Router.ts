import { Node } from "./Node.ts";

export class Router extends Node {
  hostname: string;

  constructor(id: string, hostname: string, x: number, y: number) {
    super(id, { x, y });
    this.hostname = hostname;
  }
}
