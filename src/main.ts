import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CircularProgressBar } from "./progress_bar"; // Перевірте назву файлу (progress_bar або progressbar)

interface TimerPayload {
  formatted: string;
  progress: number;
  is_finished: boolean;
}

let isRunning = false;

const playBtn = document.querySelector<HTMLButtonElement>(".timer-button-play");
const pauseBtn = document.querySelector<HTMLButtonElement>(".timer-button-pause");

window.addEventListener("DOMContentLoaded", async () => {
  const timerTextEl = document.querySelector<HTMLElement>(".timer-text");
  const timerBtn = document.querySelector<HTMLButtonElement>(".timer-button");

  // Ініціалізуємо твій клас без зайвих параметрів
  const progressBar = new CircularProgressBar({
    radius: 42,
    circleSelector: ".progress-circle",
  });

  // Початковий стан — 100%
  progressBar.setProgress(100);

  // Підписка на фоновий таймер з Rust
  await listen<TimerPayload>("timer-tick", async (event) => {
    const { formatted, progress, is_finished } = event.payload;

    if (timerTextEl) {
      timerTextEl.textContent = formatted;
    }

    // Твій метод setProgress приймає float від Rust (100.0 -> 0.0)
    progressBar.setProgress(progress);

    if (is_finished) {
      isRunning = false;
      await invoke("stop_timer");
      setActive(isRunning);
    }
  });

  await invoke("start_timer", { durationSeconds: 0.1 * 60 });
  setActive(true);

  // Клік по кнопці (Запуск / Зупинка)
  timerBtn?.addEventListener("click", async () => {
    if (!isRunning) {
      // Запуск на 15 хвилин
      await invoke("resume_timer");
      isRunning = true;
    } else {
      await invoke("pause_timer");
      isRunning = false;
    }
    setActive(isRunning);
  });
});

function setActive(active: boolean) {
  playBtn?.classList.toggle("active", active === true);
  pauseBtn?.classList.toggle("active", active === false);
}

// await invoke("start_timer", { durationSeconds: 15 * 60 });
// await invoke("pause_timer");
// await invoke("resume_timer");
// await invoke("stop_timer");
