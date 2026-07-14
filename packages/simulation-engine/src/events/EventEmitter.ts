type Listener<T> = (payload: T) => void;

// Minimal pub/sub used instead of DOM's EventTarget, which is a browser API
// the simulation engine must not depend on.
export class EventEmitter<T> {
  private listeners: Listener<T>[];

  constructor() {
    this.listeners = [];
  }

  on(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => this.off(listener);
  }

  off(listener: Listener<T>): void {
    this.listeners = this.listeners.filter((registered) => registered !== listener);
  }

  emit(payload: T): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}
