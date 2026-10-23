export interface ProgressBarOptions {
  radius?: number;
  circleSelector?: string;
}

export class CircularProgressBar {
  private progressCircle: SVGCircleElement | null;
  private radius: number;
  private circumference: number;

  constructor(options: ProgressBarOptions = {}) {
    const circleSel = options.circleSelector || '.progress-circle';

    this.progressCircle = document.querySelector<SVGCircleElement>(circleSel);
    this.radius = options.radius ?? 42;
    this.circumference = 2 * Math.PI * this.radius; // ~263.89

    this.init();
  }

  private init(): void {
    const elements = [this.progressCircle];

    elements.forEach((el) => {
      if (el) {
        el.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        el.style.strokeDashoffset = `${this.circumference}`;
      }
    });
  }

  public setProgress(percent: number): void {
    const safePercent = Math.max(0, Math.min(100, percent));
    const offset = this.circumference - (safePercent / 100) * this.circumference;

    if (this.progressCircle) {
      this.progressCircle.style.strokeDashoffset = `${offset}`;
    }
  }

  public getCircumference(): number {
    return this.circumference;
  }
}
