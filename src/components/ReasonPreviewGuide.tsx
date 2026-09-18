import { useState } from "react";
import { PREVIEW_COLORS, type ReasonPreview } from "../game/coachPreview";
import type { Board as ReversiBoard } from "../game/reversi";
import { Board } from "./Board";
import { PreviewEye } from "./ReasonButton";

function ClosePreview({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" className="clear-preview-button" onClick={onClear} aria-label="Clear board preview" title="Clear preview (Escape)">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="m5 5 10 10M15 5 5 15" />
      </svg>
    </button>
  );
}

export function ReasonPreviewGuide({ preview, pinned, onClear }: {
  preview: ReasonPreview | null;
  pinned: boolean;
  onClear: () => void;
}) {
  return (
    <div className={`coach-visual-guide ${preview ? "is-active" : ""}`}>
      <div className="visual-guide-heading">
        <PreviewEye />
        <span>{preview ? "PREVIEW ONLY / NO MOVE PLAYED" : "EXPLORE THE WHY"}</span>
        {preview && <span className="visual-guide-mode">{pinned ? "PINNED" : "LIVE"}</span>}
        {preview && <ClosePreview onClear={onClear} />}
      </div>
      <div id="board-preview-explanation" className="visual-guide-copy" aria-live="polite" aria-atomic="true">
        <strong>{preview?.title ?? "Make every explanation visible."}</strong>
        <p>{preview?.caption ?? "Hover or focus a reason to highlight its discs and squares. Click or tap to pin it while you study. Escape clears the preview."}</p>
      </div>
      <div className="preview-legend" aria-label="Board preview legend">
        {preview ? preview.legend.map((item) => (
          <span key={item.role} className="preview-legend-item">
            <i className={`preview-legend-symbol symbol-${item.role}`} style={{ color: PREVIEW_COLORS[item.role] }} aria-hidden="true">
              {item.role === "move" ? "1" : item.role === "blocked" ? "x" : null}
            </i>
            {item.label}
          </span>
        )) : <span className="preview-reassurance">Your discs, score, and turn stay unchanged.</span>}
      </div>
    </div>
  );
}

const ignore = () => undefined;

export function MobileReasonPreview({ board, preview, onClear, onViewBoard }: {
  board: ReversiBoard;
  preview: ReasonPreview;
  onClear: () => void;
  onViewBoard: () => void;
}) {
  const [hiddenPreview, setHiddenPreview] = useState<ReasonPreview | null>(null);
  if (hiddenPreview === preview) return null;

  return (
    <aside className="mobile-reason-preview" aria-label="Visual coaching preview">
      <div className="mobile-preview-board" aria-hidden="true">
        <Board
          board={board}
          validMoves={[]}
          bestIndex={null}
          showHints={false}
          recentFlips={[]}
          lastPlaced={null}
          interactive={false}
          ratings={null}
          reasonPreview={preview}
          miniature
          onCell={ignore}
          onInspect={ignore}
        />
      </div>
      <div className="mobile-preview-copy">
        <span>PREVIEW / NOT PLAYED</span>
        <strong>{preview.title}</strong>
        <p>Faded discs are hypothetical. Your game is unchanged.</p>
        <button type="button" className="text-button" onClick={() => {
          setHiddenPreview(preview);
          onViewBoard();
        }}>VIEW FULL BOARD</button>
      </div>
      <ClosePreview onClear={onClear} />
    </aside>
  );
}