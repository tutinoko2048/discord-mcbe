type Listener<T> = (data: T) => void;

export class Emitter<T> {
  private listeners = new Map<keyof T, Array<Listener<any>>>();

  public on<K extends keyof T>(event: K, listener: Listener<T[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public once<K extends keyof T>(event: K, listener: Listener<T[K]>): void {
    const onceListener: Listener<T[K]> = (data) => {
      listener(data);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  public emit<K extends keyof T>(event: K, data: T[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(data);
    }
  }

  public off<K extends keyof T>(event: K, listener: Listener<T[K]>): void {
    const currentListeners = this.listeners.get(event);
    if (currentListeners) {
      this.listeners.set(
        event,
        currentListeners.filter((l) => l !== listener),
      );
    }
  }

  public removeAllListeners<K extends keyof T>(event: K): void {
    this.listeners.set(event, []);
  }
}
