import type { Vector2 } from "../entities/Entity";
import type { Link } from "../entities/Link";

export interface Movement {
  from: Vector2;
  to: Vector2;
  // Waypoints after "to", in order; empty once "to" is the final destination.
  remainingWaypoints: Vector2[];
  speed: number; // world units per second
  progress: number; // 0 at "from", 1 at "to", for the current from->to segment
}

// links must be a non-empty, ordered chain, each connecting to the next
// (link[i].to and link[i + 1].from are the same node). The path is resolved
// once, from each node's connectionPoint, at construction time.
export function createMovement(links: Link[], speed: number): Movement {
  if (links.length === 0) {
    throw new Error("A movement path needs at least one link");
  }

  const [firstLink, ...restLinks] = links;
  const from = firstLink.from.connectionPoint;
  const to = firstLink.to.connectionPoint;
  const remainingWaypoints = restLinks.map((link) => link.to.connectionPoint);

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
