export interface Vector2 {
  x: number;
  y: number;
}

export abstract class Entity {
  id: string;
  position: Vector2;

  constructor(id: string, position: Vector2) {
    this.id = id;
    this.position = position;
  }

  update(_delta: number): void {}
}
