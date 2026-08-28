"use client";
import { CURRENT_EVENT_CONTRACT_VERSION, type EventName } from "./events";

const INSTALL_ID_KEY = "futforge_install_id";
const SESSION_ID_KEY = "futforge_session_id";
const ENDPOINT = "/api/analytics/events";
const FLUSH_INTERVAL_MS = 2000;
const FLUSH_AT_QUEUE_SIZE = 10;
const SEND_TIMEOUT_MS = 3000;

type QueuedEvent = {
  event: EventName;
  event_id: string;
  event_version: number;
  timestamp: number;
  client_type: "web";
  client_version?: string;
  install_id: string;
  session_id: string;
  properties?: Record<string, string | number | boolean | null>;
};

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function installId(): string {
  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY);
    if (existing) return existing;
    const value = uuid();
    localStorage.setItem(INSTALL_ID_KEY, value);
    return value;
  } catch {
    return "unknown";
  }
}

function sessionId(): { id: string; isNew: boolean } {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return { id: existing, isNew: false };
    const value = uuid();
    sessionStorage.setItem(SESSION_ID_KEY, value);
    return { id: value, isNew: true };
  } catch {
    return { id: "unknown", isNew: false };
  }
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function send(events: QueuedEvent[], useBeacon: boolean) {
  if (!events.length) return;
  const body = JSON.stringify({ events });
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
  } catch {
    // Analytics must never break the caller.
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush(false);
  }, FLUSH_INTERVAL_MS);
}

function flush(useBeacon: boolean) {
  if (!queue.length) return;
  const events = queue;
  queue = [];
  send(events, useBeacon);
}

function enqueue(event: EventName, properties?: Record<string, string | number | boolean | null>): void {
  const session = sessionId();
  // A fresh session_id means this is the first track() call of the browser
  // tab session - emit session_started once, before the event that triggered it.
  if (session.isNew && event !== "session_started") enqueue("session_started", undefined);
  queue.push({
    event,
    event_id: uuid(),
    event_version: CURRENT_EVENT_CONTRACT_VERSION,
    timestamp: Date.now(),
    client_type: "web",
    install_id: installId(),
    session_id: session.id,
    properties,
  });
}

export function track(event: EventName, properties?: Record<string, string | number | boolean | null>): void {
  if (typeof window === "undefined") return;
  try {
    enqueue(event, properties);
    if (queue.length >= FLUSH_AT_QUEUE_SIZE) flush(false);
    else scheduleFlush();
  } catch {
    // Analytics must never break the caller.
  }
}

let listenersAttached = false;
export function attachAnalyticsLifecycleListeners(): void {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}
