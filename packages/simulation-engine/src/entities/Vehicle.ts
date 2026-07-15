import { Entity } from "./Entity.ts";
import type { Movement } from "../movement/Movement";

export class Vehicle extends Entity {
  movement: Movement;

  constructor(id: string, movement: Movement) {
    super(id, { ...movement.from });
    this.movement = movement;
  }
}
