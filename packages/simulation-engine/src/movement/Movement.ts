import type { Vector2 } from "../entities/Entity";

export interface Movement {
  from: Vector2;
  to: Vector2;
  // Waypoints after "to", in order; empty once "to" is the final destination.
  remainingWaypoints: Vector2[];
  speed: number; // world units per second
  progress: number; // 0 at "from", 1 at "to", for the current from->to segment
}

// path must have at least two points: a start and a destination, with any
// intermediate waypoints in between, in travel order.
export function createMovement(path: Vector2[], speed: number): Movement {
  if (path.length < 2) {
    throw new Error("A movement path needs at least two points");
  }

  const [from, to, ...remainingWaypoints] = path;
  return { from, to, remainingWaypoints, speed, progress: 0 };
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

export function isMovementComplete(movement: Movement): boolean {
  return movement.progress >= 1 && movement.remainingWaypoints.length === 0;
}
