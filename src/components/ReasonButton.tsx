import type { Reason } from "../game/engine";
import type { ReasonControls } from "../hooks/useReasonPreview";

export function PreviewEye({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ReasonButton({ reason, controls, compact = false }: {
  reason: Reason;
  controls: ReasonControls;
  compact?: boolean;
}) {
  const active = controls.activeId === reason.id;
  const pinned = controls.pinnedId === reason.id;

  return (
    <button
      type="button"
      className={`reason-button reason-${reason.tone} ${compact ? "is-compact" : ""} ${active ? "is-active" : ""} ${pinned ? "is-pinned" : ""}`}
      data-coach-reason={reason.id}
      aria-label={`${reason.text} ${pinned ? "Unpin" : "Preview"} this explanation on the board.`}
      aria-pressed={pinned}
      aria-controls="match-board"
      disabled={!controls.enabled}
      title="Hover or focus to preview. Click or tap to pin. Escape clears the preview."
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") controls.onInteract(reason, "hover");
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") controls.onInteract(reason, "leave");
      }}
      onPointerCancel={() => controls.onInteract(reason, "leave")}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) controls.onInteract(reason, "focus");
      }}
      onBlur={() => controls.onInteract(reason, "blur")}
      onClick={() => controls.onInteract(reason, "pin")}
    >
      {!compact && <span className="reason-bullet" aria-hidden="true" />}
      <span className="reason-text">{reason.text}</span>
      <span className="reason-preview-affordance" aria-hidden="true">
        <PreviewEye />
        <span>{pinned ? "PINNED" : "SHOW"}</span>
      </span>
    </button>
  );
}