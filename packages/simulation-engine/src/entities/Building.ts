import { Node } from "./Node.ts";
import type { Vector2 } from "./Entity";

// position is the top-left corner of the footprint (unlike Router, whose
// position is its center) so it maps directly onto rect-based rendering.
export class Building extends Node {
  name: string;
  width: number;
  height: number;

  constructor(
    id: string,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    super(id, { x, y });
    this.name = name;
    this.width = width;
    this.height = height;
  }

  override get connectionPoint(): Vector2 {
    return {
      x: this.position.x + this.width / 2,
      y: this.position.y + this.height / 2,
    };
  }
}
