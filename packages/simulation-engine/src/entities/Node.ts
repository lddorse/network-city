import { Entity } from "./Entity";
import type { Vector2 } from "./Entity";
import type { NetworkInterface } from "./NetworkInterface";

// The point other Nodes connect to via a Link. Defaults to the node's own
// position; subtypes whose position isn't their visual/logical center
// (e.g. Building, whose position is a rect's top-left corner) override it.
export abstract class Node extends Entity {
  interfaces: NetworkInterface[] = [];

  get connectionPoint(): Vector2 {
    return this.position;
  }
}
