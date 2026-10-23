import { CircularProgressBar } from "./progress_bar";

let progressBar: CircularProgressBar | null = null;

window.addEventListener("DOMContentLoaded", () => {
  progressBar = new CircularProgressBar({
    radius: 42,
    circleSelector: ".progress-circle",
  });

  progressBar.setProgress(100);

});
