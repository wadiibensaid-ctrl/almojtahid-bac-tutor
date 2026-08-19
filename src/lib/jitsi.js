// Single source of truth for the Jitsi instance this app embeds against.
// Documented future migration point: swap this for a self-hosted Jitsi
// domain once volume or branding justifies moving off the free public
// instance — nothing else in the app should hardcode "meet.jit.si".
export const JITSI_DOMAIN = "meet.jit.si";

// Full default toolbar (per Jitsi's config.js) minus 'desktop' and
// 'whiteboard' — screen share and opening the whiteboard are both
// restricted to the teacher's own embed, which passes no toolbarButtons
// override and so keeps every button. Jitsi's whiteboard has no
// per-participant permission (confirmed against jitsi-meet's own open
// issues) — it's a single room-wide canvas, editable by everyone once
// open. Removing this button only stops a student from opening/closing
// it themselves; once the teacher opens it, students can still draw on
// it, same as any other participant would.
export const STUDENT_TOOLBAR_BUTTONS = [
  "camera", "chat", "closedcaptions", "download",
  "embedmeeting", "etherpad", "feedback", "fullscreen", "hangup",
  "help", "highlight", "invite", "linktosalesforce", "livestreaming",
  "microphone", "noisesuppression", "participants-pane", "profile",
  "raisehand", "recording", "security", "select-background", "settings",
  "shareaudio", "sharedvideo", "shortcuts", "stats", "tileview",
  "toggle-camera", "videoquality",
];

let scriptPromise = null;

/**
 * Loads the Jitsi IFrame API script once and caches the promise, so
 * multiple embeds on the same page (or re-mounts) don't inject it twice.
 */
export function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow retrying on a later attempt
      reject(new Error("Failed to load Jitsi external_api.js"));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}
