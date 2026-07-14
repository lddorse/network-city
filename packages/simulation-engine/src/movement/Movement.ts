import type { Vector2 } from "../entities/Entity";

export interface Movement {
  from: Vector2;
  to: Vector2;
  speed: number; // world units per second
  progress: number; // 0 at "from", 1 at "to"
}

export function createMovement(from: Vector2, to: Vector2, speed: number): Movement {
  return { from, to, speed, progress: 0 };
}

export function movementDistance(movement: Movement): number {
  const dx = movement.to.x - movement.from.x;
  const dy = movement.to.y - movement.from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function positionAlongMovement(movement: Movement): Vector2 {
  return {
    x: movement.from.x + (movement.to.x - movement.from.x) * movement.progress,
    y: movement.from.y + (movement.to.y - movement.from.y) * movement.progress,
  };
}
