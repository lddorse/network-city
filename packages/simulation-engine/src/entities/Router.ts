import { Entity } from "./Entity";

export class Router extends Entity {
  constructor(
    id: string,
    public hostname: string,
    x: number,
    y: number
  ) {
    super(id, { x, y });
  }
}
