import { CircularProgressBar } from "./progress_bar";

let progressBar: CircularProgressBar | null = null;

window.addEventListener("DOMContentLoaded", () => {
  // Ініціалізація прогрес-бару
  progressBar = new CircularProgressBar({
    radius: 42,
    circleSelector: ".progress-circle",
  });

  // Встановлюємо початкове значення (наприклад, 100%)
  progressBar.setProgress(88);
});