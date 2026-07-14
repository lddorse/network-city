import { Entity } from "./Entity";

export class Building extends Entity {
  constructor(
    id: string,
    public name: string,
    x: number,
    y: number
  ) {
    super(id, { x, y });
  }
}
