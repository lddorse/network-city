export interface Vector2 {
  x: number;
  y: number;
}

export abstract class Entity {
  constructor(
    public id: string,
    public position: Vector2
  ) {}

  update(_delta: number): void {}
}
