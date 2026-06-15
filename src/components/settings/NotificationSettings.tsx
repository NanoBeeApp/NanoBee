/**
 * Notification preferences section of the /settings page.
 *
 * Renders three groups inside the shared settings detail pane:
 *   1. Channels — email and web-push channel toggles (in-app is always on).
 *   2. Do Not Disturb — start and end time (minutes-from-midnight → HH:MM inputs).
 *   3. Digest & importance — daily digest toggle, digest time, importance threshold.
 *
 * Web Push opt-in control wraps the usePushNotifications hook and is
 * gracefully disabled when VAPID is not configured on the server.
 *
 * Changes auto-save with a debounce (same pattern as AiSettingsForm /
 * SettingsView). The component is stateless on the push-subscription side;
 * it delegates to usePushNotifications.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "../../icons/icons";
import { usePushNotifications } from "../../lib/usePushNotifications";
import {
  useNotificationSettings,
  useSaveNotificationSettings,
  type NotificationSettings,
} from "../../lib/useNotificationSettings";

/** Debounce window before an edit is auto-saved (ms). */
const AUTOSAVE_DELAY = 700;

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Convert "HH:MM" to minutes from midnight (0–1439). */
function hhmmToMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  return (hh ?? 0) * 60 + (mm ?? 0);
}

/** Convert minutes from midnight (0–1439) to "HH:MM". */
function minutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Default settings (mirrors backend defaults)
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  pushEnabled: true,
  dndStart: null,
  dndEnd: null,
  digestEnabled: false,
  digestTime: "08:00",
  importanceThreshold: "normal",
};

// ---------------------------------------------------------------------------
// SaveState indicator
// ---------------------------------------------------------------------------

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveHint({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text =
    state === "saving" ? "Saving…" :
    state === "saved" ? "Saved" :
    "Save failed — please retry";
  return (
    <div className="nb-ai-savehint" data-state={state} role="status">
      <span className="dot" aria-hidden="true" />
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

interface ToggleProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
}

function Toggle({ id, checked, disabled, onChange, ...rest }: ToggleProps) {
  return (
    <label className="nb-toggle" htmlFor={id} aria-label={rest["aria-label"]}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="nb-toggle-track">
        <div className="nb-toggle-thumb" aria-hidden="true" />
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Web Push opt-in block
// ---------------------------------------------------------------------------

function PushOptIn() {
  const { state, isSupported, subscribe, unsubscribe, error } = usePushNotifications();

  const stateLabel =
    state === "subscribed" ? "Push enabled on this device" :
    state === "loading" ? "Working…" :
    state === "denied" ? "Permission denied" :
    state === "unsupported" ? "Not supported in this browser" :
    "Not enabled";

  const stateClass =
    state === "subscribed" ? "state-subscribed" :
    state === "loading" ? "state-loading" :
    state === "denied" ? "state-denied" :
    "";

  return (
    <div className="nb-push-block" data-testid="push-opt-in">
      <div className="nb-push-icon" aria-hidden="true">
        <Icons.smartphone size={18} />
      </div>
      <div className="nb-push-content">
        <b>Browser push notifications</b>
        <span>Receive alerts on this device even when the tab is in the background.</span>
        <div className={`nb-push-state ${stateClass}`}>
          <span className="dot" aria-hidden="true" />
          {stateLabel}
        </div>
        {error && <span className="nb-push-error" role="alert">{error}</span>}
        {isSupported && state !== "unsupported" && (
          <div className="nb-push-action">
            {state === "subscribed" ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void unsubscribe()}
                data-testid="push-unsubscribe"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={state === "loading" || state === "denied"}
                onClick={() => void subscribe()}
                data-testid="push-subscribe"
              >
                {state === "loading" ? "Working…" : "Enable push notifications"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface NotificationSettingsProps {
  /** Whether the signed-in user's settings have loaded. */
  userEnabled: boolean;
}

export function NotificationSettings({ userEnabled }: NotificationSettingsProps) {
  const { data: serverSettings, isLoading } = useNotificationSettings(userEnabled);
  const save = useSaveNotificationSettings();

  // Local form state — initialised from server data when it arrives.
  const [values, setValues] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // DND checkbox + local time inputs (separate from dndStart/dndEnd null state).
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStartStr, setDndStartStr] = useState("22:00");
  const [dndEndStr, setDndEndStr] = useState("07:00");

  // Seed local state from the server once on load.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !serverSettings) return;
    seededRef.current = true;
    setValues(serverSettings);
    setDndEnabled(serverSettings.dndStart !== null);
    if (serverSettings.dndStart !== null) setDndStartStr(minutesToHhmm(serverSettings.dndStart));
    if (serverSettings.dndEnd !== null) setDndEndStr(minutesToHhmm(serverSettings.dndEnd));
  }, [serverSettings]);

  // Debounced auto-save.
  const dirtyRef = useRef(false);
  const buildPayload = useCallback((): NotificationSettings => {
    return {
      ...values,
      dndStart: dndEnabled ? hhmmToMinutes(dndStartStr) : null,
      dndEnd: dndEnabled ? hhmmToMinutes(dndEndStr) : null,
    };
  }, [values, dndEnabled, dndStartStr, dndEndStr]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    setSaveState("saving");
    const payload = buildPayload();
    const timer = setTimeout(async () => {
      try {
        await save.mutateAsync(payload);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, dndEnabled, dndStartStr, dndEndStr]);

  function change<K extends keyof NotificationSettings>(key: K, val: NotificationSettings[K]) {
    dirtyRef.current = true;
    setValues((v) => ({ ...v, [key]: val }));
  }

  function changeDnd(enabled: boolean) {
    dirtyRef.current = true;
    setDndEnabled(enabled);
  }

  if (isLoading) {
    return (
      <>
        <Icons.bell size={20} style={{ color: "var(--ink-4)", margin: "auto" }} />
        <p style={{ color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
          Loading notification preferences…
        </p>
      </>
    );
  }

  return (
    <>
      {/* ---- Header ---- */}
      <div className="nb-ai-detail-head" data-testid="notification-settings">
        <div className="title">Notifications</div>
        <div className="sub">
          Control how and when NanoBee notifies you. Changes save automatically.
        </div>
      </div>

      {/* ---- Channels ---- */}
      <div className="nb-notif-section">
        <div className="nb-notif-section-title">Channels</div>

        {/* In-app — always on, show but disable */}
        <div className="nb-notif-row">
          <div className="nb-notif-row-label">
            <b>In-app</b>
            <span>Feed updates on the Today page — always on.</span>
          </div>
          <Toggle id="notif-inapp" checked disabled onChange={() => undefined} aria-label="In-app notifications (always on)" />
        </div>

        {/* Email */}
        <div className="nb-notif-row">
          <div className="nb-notif-row-label">
            <b>Email</b>
            <span>Digest and alert emails sent to your account address.</span>
          </div>
          <Toggle
            id="notif-email"
            checked={values.emailEnabled}
            onChange={(v) => change("emailEnabled", v)}
            aria-label="Email notifications"
          />
        </div>

        {/* Web Push */}
        <div className="nb-notif-row">
          <div className="nb-notif-row-label">
            <b>Web push</b>
            <span>Browser push alerts for high-importance events.</span>
          </div>
          <Toggle
            id="notif-push"
            checked={values.pushEnabled}
            onChange={(v) => change("pushEnabled", v)}
            aria-label="Web push notifications"
          />
        </div>
      </div>

      {/* ---- Web Push opt-in (device-level) ---- */}
      {values.pushEnabled && <PushOptIn />}

      {/* ---- Do Not Disturb ---- */}
      <div className="nb-notif-section">
        <div className="nb-notif-section-title">Do Not Disturb</div>
        <div className="nb-notif-row">
          <div className="nb-notif-row-label">
            <b>Quiet hours (UTC)</b>
            <span>Suppress push notifications during this window.</span>
          </div>
          <Toggle
            id="notif-dnd"
            checked={dndEnabled}
            onChange={changeDnd}
            aria-label="Enable do-not-disturb window"
          />
        </div>
        {dndEnabled && (
          <div className="nb-notif-time-row">
            <input
              type="time"
              className="input"
              value={dndStartStr}
              aria-label="DND start time (UTC)"
              onChange={(e) => { dirtyRef.current = true; setDndStartStr(e.target.value); }}
              data-testid="dnd-start"
            />
            <span className="nb-notif-time-sep">to</span>
            <input
              type="time"
              className="input"
              value={dndEndStr}
              aria-label="DND end time (UTC)"
              onChange={(e) => { dirtyRef.current = true; setDndEndStr(e.target.value); }}
              data-testid="dnd-end"
            />
            <span className="nb-notif-time-sep" style={{ fontSize: "11px", color: "var(--ink-4)" }}>
              Midnight-wrapping supported (e.g. 22:00–06:00)
            </span>
          </div>
        )}
      </div>

      {/* ---- Digest ---- */}
      <div className="nb-notif-section">
        <div className="nb-notif-section-title">Digest Mode</div>
        <div className="nb-notif-row">
          <div className="nb-notif-row-label">
            <b>Daily digest</b>
            <span>Bundle low-importance items into one daily summary.</span>
          </div>
          <Toggle
            id="notif-digest"
            checked={values.digestEnabled}
            onChange={(v) => change("digestEnabled", v)}
            aria-label="Enable daily digest"
          />
        </div>
        {values.digestEnabled && (
          <div className="field">
            <label className="field-label" htmlFor="notif-digest-time">
              Digest delivery time (UTC)
            </label>
            <input
              id="notif-digest-time"
              type="time"
              className="input"
              value={values.digestTime}
              aria-label="Daily digest delivery time (UTC)"
              onChange={(e) => change("digestTime", e.target.value)}
              data-testid="digest-time"
              style={{ maxWidth: "120px" }}
            />
          </div>
        )}
      </div>

      {/* ---- Importance threshold ---- */}
      <div className="nb-notif-section">
        <div className="nb-notif-section-title">Importance threshold</div>
        <p className="nb-ai-subhint">
          Items at or above this level interrupt immediately. Items below are held
          for the digest (when digest mode is on).
        </p>
        <div className="nb-notif-pills" role="radiogroup" aria-label="Importance threshold">
          {(["low", "normal", "high"] as const).map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={values.importanceThreshold === level}
              className={`nb-notif-pill${values.importanceThreshold === level ? " active" : ""}`}
              onClick={() => change("importanceThreshold", level)}
              data-testid={`importance-${level}`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <p className="nb-ai-subhint" style={{ marginTop: "6px" }}>
          {values.importanceThreshold === "low" && "All items interrupt immediately, even low-priority ones."}
          {values.importanceThreshold === "normal" && "Low-importance items go to digest; normal and high interrupt."}
          {values.importanceThreshold === "high" && "Only high-importance items interrupt; all others go to digest."}
        </p>
      </div>

      {/* ---- Auto-save indicator ---- */}
      <SaveHint state={saveState} />
    </>
  );
}
