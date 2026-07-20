export class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(public limit: number) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("semaphore limit must be a positive integer");
  }

  setLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("semaphore limit must be a positive integer");
    this.limit = limit;
    while (this.active < this.limit && this.waiters.length) this.waiters.shift()?.();
  }

  async use<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    this.waiters.shift()?.();
  }
}
