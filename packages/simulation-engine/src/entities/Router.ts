import { Entity } from "./Entity";

export class Router extends Entity {
  hostname: string;

  constructor(id: string, hostname: string, x: number, y: number) {
    super(id, { x, y });
    this.hostname = hostname;
  }
}
