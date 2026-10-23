import { CircularProgressBar } from "./progress_bar";
import { Timer } from "./timer";

// let progressBar: CircularProgressBar | null = null;

window.addEventListener("DOMContentLoaded", () => {
  const progressBar = new CircularProgressBar({
    radius: 42,
    circleSelector: ".progress-circle",
  });

  progressBar.setProgress(100);

  const textElement = document.querySelector<HTMLElement>(".timer-text")!;

  const timer = new Timer({
    progressBar,                 // ваш об'єкт з setProgress(0..100)
    textElement,
    onComplete: () => console.log("Час вийшов!"),
  });

  timer.start(0.1 * 60);

});
