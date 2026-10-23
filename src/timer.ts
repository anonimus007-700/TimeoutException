type ProgressBarLike = {
  setProgress: (value: number) => void;
};

interface TimerOptions {
  progressBar: ProgressBarLike;
  textElement: HTMLElement;
  onComplete?: () => void;
  tickMs?: number;
}

export class Timer {
  private progressBar: ProgressBarLike;
  private textElement: HTMLElement;
  private onComplete?: () => void;
  private tickMs: number;

  private durationMs = 0;
  private endTime = 0;
  private remainingMs = 0; // для паузи
  private intervalId: number | null = null;
  private running = false;

  constructor(options: TimerOptions) {
    this.progressBar = options.progressBar;
    this.textElement = options.textElement;
    this.onComplete = options.onComplete;
    this.tickMs = options.tickMs ?? 250;

    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  /** Запустити таймер на N секунд */
  start(seconds: number): void {
    this.stopInterval();

    this.durationMs = seconds * 1000;
    this.remainingMs = this.durationMs;
    this.endTime = Date.now() + this.durationMs;
    this.running = true;

    this.render(this.durationMs);
    this.intervalId = window.setInterval(this.tick, this.tickMs);
  }

  pause(): void {
    if (!this.running) return;
    this.remainingMs = Math.max(0, this.endTime - Date.now());
    this.running = false;
    this.stopInterval();
  }

  resume(): void {
    if (this.running || this.remainingMs <= 0) return;
    this.endTime = Date.now() + this.remainingMs;
    this.running = true;
    this.intervalId = window.setInterval(this.tick, this.tickMs);
    this.tick();
  }

  reset(): void {
    this.stopInterval();
    this.running = false;
    this.remainingMs = this.durationMs;
    this.render(this.durationMs);
  }

  destroy(): void {
    this.stopInterval();
    document.removeEventListener("visibilitychange", this.handleVisibility);
  }

  // ---------- internal ----------

  private tick = (): void => {
    if (!this.running) return;

    const left = Math.max(0, this.endTime - Date.now());
    this.render(left);

    if (left <= 0) {
      this.running = false;
      this.stopInterval();
      this.onComplete?.();
    }
  };

  private render(leftMs: number): void {
    const progress =
      this.durationMs > 0
        ? Math.ceil(leftMs * 100 / this.durationMs )
        : 100;

    this.progressBar.setProgress(Math.min(100, Math.max(0, progress)));
    this.textElement.textContent = this.format(leftMs);
  }

  private format(ms: number): string {
    // ceil, щоб показувало 00:01 до самого кінця, а не 00:00 за секунду до завершення
    const totalSeconds = Math.ceil(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Коли вікно знову стає видимим, одразу синхронізуємо стан */
  private handleVisibility = (): void => {
    if (!document.hidden && this.running) {
      this.tick();
    }
  };
}
