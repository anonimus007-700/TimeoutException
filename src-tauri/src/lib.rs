use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter, State};
use tokio::time::{sleep, Duration, Instant};

#[derive(Clone, serde::Serialize)]
pub struct TimerPayload {
    pub formatted: String,
    pub progress: f64, // 100 -> 0
    pub is_finished: bool,
}

struct Inner {
    total: Duration,
    remaining: Duration,        // залишок (зберігається на паузі)
    deadline: Option<Instant>,  // Some = таймер іде, None = пауза/стоп
}

pub struct TimerState {
    generation: Arc<AtomicU64>,
    inner: Arc<Mutex<Inner>>,
}

fn format_remaining(remaining: Duration) -> String {
    // Округлення вгору, щоб 00:00 не показувало за секунду до кінця
    let total_secs = (remaining.as_millis() as u64 + 999) / 1000;
    format!("{:02}:{:02}", total_secs / 60, total_secs % 60)
}

fn make_payload(remaining: Duration, total: Duration) -> TimerPayload {
    let progress = if total.is_zero() {
        0.0
    } else {
        (remaining.as_secs_f64() / total.as_secs_f64() * 100.0).clamp(0.0, 100.0)
    };
    TimerPayload {
        formatted: format_remaining(remaining),
        progress,
        is_finished: remaining.is_zero(),
    }
}

/// Запускає цикл відліку від `remaining`. Старі цикли завершуються самі.
fn spawn_ticker(app: AppHandle, state: &TimerState, remaining: Duration) {
    let my_gen = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let generation = state.generation.clone();
    let inner = state.inner.clone();

    let deadline = Instant::now() + remaining;
    let total = {
        let mut i = inner.lock().unwrap();
        i.deadline = Some(deadline);
        i.total
    };

    tauri::async_runtime::spawn(async move {
        while generation.load(Ordering::SeqCst) == my_gen {
            let left = deadline.saturating_duration_since(Instant::now());
            let _ = app.emit("timer-tick", make_payload(left, total));

            if left.is_zero() {
                let mut i = inner.lock().unwrap();
                i.deadline = None;
                i.remaining = Duration::ZERO;
                break;
            }

            sleep(left.min(Duration::from_millis(100))).await;
        }
    });
}

// УВАГА: команди в lib.rs не можна оголошувати як `pub`
#[tauri::command]
fn start_timer(app: AppHandle, state: State<'_, TimerState>, duration_seconds: u64) {
    let total = Duration::from_secs(duration_seconds);
    {
        let mut i = state.inner.lock().unwrap();
        i.total = total;
        i.remaining = total;
    }
    spawn_ticker(app, &state, total);
}

/// Пауза: запам'ятовує залишок, нічого не скидає
#[tauri::command]
fn pause_timer(app: AppHandle, state: State<'_, TimerState>) {
    let mut i = state.inner.lock().unwrap();
    if let Some(deadline) = i.deadline.take() {
        state.generation.fetch_add(1, Ordering::SeqCst); // зупиняє цикл
        i.remaining = deadline.saturating_duration_since(Instant::now());
        let _ = app.emit("timer-tick", make_payload(i.remaining, i.total));
    }
}

/// Продовження з того місця, де зупинились
#[tauri::command]
fn resume_timer(app: AppHandle, state: State<'_, TimerState>) {
    let remaining = {
        let i = state.inner.lock().unwrap();
        if i.deadline.is_some() || i.remaining.is_zero() {
            return; // вже йде або закінчився
        }
        i.remaining
    };
    spawn_ticker(app, &state, remaining);
}

/// Повний стоп зі скиданням на початок (круг знову 100)
#[tauri::command]
fn stop_timer(app: AppHandle, state: State<'_, TimerState>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
    let mut i = state.inner.lock().unwrap();
    i.deadline = None;
    i.remaining = i.total;
    let _ = app.emit("timer-tick", make_payload(i.total, i.total));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TimerState {
            generation: Arc::new(AtomicU64::new(0)),
            inner: Arc::new(Mutex::new(Inner {
                total: Duration::ZERO,
                remaining: Duration::ZERO,
                deadline: None,
            })),
        })
        .invoke_handler(tauri::generate_handler![
            start_timer,
            pause_timer,
            resume_timer,
            stop_timer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
