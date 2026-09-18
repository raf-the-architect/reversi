import { memo, useId, useMemo, useState } from "react";
import { PREVIEW_COLORS, PREVIEW_LABELS, type ReasonPreview } from "../game/coachPreview";
import { audio } from "../game/audio";
import { coordLabel, rowOf, colOf, type Board as ReversiBoard, type Move, type Player } from "../game/reversi";

const FILES = ["A", "B", "C", "D", "E", "F", "G", "H"];

type BoardProps = {
  id?: string;
  board: ReversiBoard;
  validMoves: Move[];
  bestIndex: number | null;
  showHints: boolean;
  recentFlips: number[];
  flipDelays?: Map<number, number> | null;
  lastPlaced: number | null;
  lastMove?: number | null;
  impact?: { index: number; key: number } | null;
  interactive: boolean;
  /** Side that would move — used to colour the hover preview ghosts. */
  previewPlayer?: Player;
  ratings: Map<number, string> | null;
  reasonPreview?: ReasonPreview | null;
  miniature?: boolean;
  onClearPreview?: () => void;
  onCell: (index: number) => void;
  onInspect: (index: number | null) => void;
};

function BoardComponent({
  id,
  board,
  validMoves,
  bestIndex,
  showHints,
  recentFlips,
  flipDelays = null,
  lastPlaced,
  lastMove = null,
  impact = null,
  interactive,
  previewPlayer = 1,
  ratings,
  reasonPreview = null,
  miniature = false,
  onClearPreview,
  onCell,
  onInspect,
}: BoardProps) {
  const arrowId = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<number | null>(null);
  const validLookup = useMemo(() => new Map(validMoves.map((move) => [move.index, move])), [validMoves]);
  const flipSet = useMemo(() => new Set(recentFlips), [recentFlips]);
  const ghosts = useMemo(() => new Map(reasonPreview?.ghosts.map((ghost) => [ghost.index, ghost]) ?? []), [reasonPreview]);
  const marks = useMemo(
    () =>
      Array.from({ length: 64 }, (_, index) => reasonPreview?.marks.filter((mark) => mark.index === index) ?? []),
    [reasonPreview],
  );

  // Mouse-only preview of what a click would flip. Kept as local state so a
  // pointer crossing the board never re-renders the whole game screen.
  const previewing = interactive && !reasonPreview && hovered !== null ? validLookup.get(hovered) : undefined;
  const previewFlips = useMemo(() => new Set(previewing?.flips ?? []), [previewing]);

  return (
    <div id={id} className={`board-wrap ${interactive ? "is-interactive" : "is-preview"} ${miniature ? "is-miniature" : ""}`}>
      <div className="axis-top" aria-hidden="true">
        {FILES.map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      <div className="board-middle">
        <div className="axis-left" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        <div
          className={`board-grid ${reasonPreview ? "has-reason-preview" : ""} ${previewing ? "has-hover-preview" : ""}`}
          role="grid"
          aria-label={reasonPreview ? `Reversi board with teaching preview: ${reasonPreview.title}. No move has been played.` : "Reversi board"}
          aria-describedby={reasonPreview && !miniature ? "board-preview-explanation" : undefined}
          data-preview={reasonPreview?.reasonId}
          onPointerLeave={() => setHovered(null)}
        >
          {Array.from({ length: 64 }, (_, index) => {
            const cell = board[index];
            const move = validLookup.get(index);
            const isBest = showHints && bestIndex === index && move !== undefined;
            const isFlipping = flipSet.has(index);
            const isPlaced = lastPlaced === index;
            const rating = ratings?.get(index);
            const ghost = ghosts.get(index);
            const cellMarks = marks[index];
            const isRelevant = cellMarks.length > 0 || Boolean(ghost);
            const coordinateVisible = cellMarks.some((mark) => mark.role !== "space" && mark.role !== "edge");
            const previewLabel = cellMarks.map((mark) => PREVIEW_LABELS[mark.role]).join(", ");
            const isPreviewTarget = previewing?.index === index;
            const isPreviewFlip = previewFlips.has(index);
            const flipDelay = isFlipping ? flipDelays?.get(index) ?? 0 : 0;
            return (
              <button
                className={`board-cell ${move ? "is-valid" : ""} ${isBest ? "is-best" : ""} ${reasonPreview && !isRelevant ? "is-annotation-dimmed" : ""} ${isRelevant && reasonPreview ? "is-annotated" : ""} ${isPreviewTarget ? "is-preview-target" : ""}`}
                type="button"
                role="gridcell"
                key={index}
                data-cell-index={index}
                data-cell-value={cell}
                aria-label={`${coordLabel(index)}${cell === 0 ? (move ? ", available move" : ", empty") : cell === 1 ? ", player 1 disc" : ", player 2 disc"}${isBest ? ", engine best move" : ""}${previewLabel ? `. Preview only: ${previewLabel}` : ""}`}
                onClick={() => {
                  setHovered(null);
                  onCell(index);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  setHovered(index);
                  if (move && interactive && !reasonPreview) {
                    audio.play("hover");
                    onInspect(index);
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "mouse") return;
                  setHovered(null);
                  if (!reasonPreview) onInspect(null);
                }}
                onPointerCancel={() => setHovered(null)}
                tabIndex={-1}
              >
                {cell !== 0 && (
                  <span
                    className={`disc disc-${cell} ${isFlipping ? "is-flipping" : ""} ${isPlaced ? "is-placed" : ""} ${ghost ? "is-preview-replaced" : ""} ${isPreviewFlip ? "is-hover-flip" : ""}`}
                    style={flipDelay ? { animationDelay: `${flipDelay}ms` } : undefined}
                  />
                )}
                {ghost && (
                  <span
                    className={`disc disc-${ghost.player} preview-ghost ghost-${ghost.kind}`}
                    key={`${reasonPreview?.reasonId}-${ghost.kind}`}
                    data-ghost-kind={ghost.kind}
                    aria-hidden="true"
                  />
                )}
                {previewing && isPreviewFlip && cell !== 0 && (
                  <span className={`disc disc-${previewPlayer} preview-ghost ghost-flip hover-ghost`} aria-hidden="true" />
                )}
                {previewing && isPreviewTarget && (
                  <span className={`disc disc-${previewPlayer} preview-ghost ghost-move hover-ghost`} aria-hidden="true" />
                )}
                {move && !reasonPreview && (
                  <span className="move-marker" aria-hidden="true">
                    <span />
                  </span>
                )}
                {isBest && !reasonPreview && <span className="best-ring" aria-hidden="true" />}
                {isBest && !reasonPreview && <span className="best-tag">BEST</span>}
                {rating && !reasonPreview && <span className={`move-rating ${isBest ? "is-best-rating" : ""}`}>{rating}</span>}
                {lastMove === index && cell !== 0 && !reasonPreview && (
                  <span className="last-move-ring" aria-hidden="true" title="Last move" />
                )}
                {impact?.index === index && <span className="impact-ripple" key={impact.key} aria-hidden="true" />}
                {cellMarks.map((mark) => (
                  <span
                    key={`${reasonPreview?.reasonId}-${mark.role}`}
                    className={`annotation-mark annotation-${mark.role}`}
                    data-annotation={mark.role}
                    aria-hidden="true"
                  >
                    {mark.role === "move" && <span className="annotation-step">1</span>}
                    {mark.role === "blocked" && (
                      <svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg>
                    )}
                    {mark.role === "safe" && (
                      <svg viewBox="0 0 20 20"><path d="m10 2 6 2v6c0 4-6 7-6 7s-6-3-6-7V4l6-2Z" /><path d="m7 9 2 2 4-4" /></svg>
                    )}
                  </span>
                ))}
                {reasonPreview && coordinateVisible && <span className="annotation-coordinate" aria-hidden="true">{coordLabel(index)}</span>}
              </button>
            );
          })}
          {reasonPreview && reasonPreview.lines.length > 0 && (
            <svg className="annotation-lines" viewBox="0 0 800 800" aria-hidden="true" key={reasonPreview.reasonId}>
              <defs>
                {[...new Set(reasonPreview.lines.map((line) => line.role))].map((role) => (
                  <marker key={role} id={`${arrowId}-${role}`} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0 0 6 3 0 6Z" fill={PREVIEW_COLORS[role]} />
                  </marker>
                ))}
              </defs>
              {reasonPreview.lines.map((line, index) => {
                const x1 = colOf(line.from) * 100 + 50;
                const y1 = rowOf(line.from) * 100 + 50;
                const x2 = colOf(line.to) * 100 + 50;
                const y2 = rowOf(line.to) * 100 + 50;
                const distance = Math.hypot(x2 - x1, y2 - y1) || 1;
                const dx = (x2 - x1) / distance;
                const dy = (y2 - y1) / distance;
                return (
                  <path
                    key={`${line.from}-${line.to}-${index}`}
                    className={`annotation-line line-${line.role}`}
                    d={`M${x1 + dx * 24} ${y1 + dy * 24}L${x2 - dx * 30} ${y2 - dy * 30}`}
                    stroke={PREVIEW_COLORS[line.role]}
                    vectorEffect="non-scaling-stroke"
                    markerEnd={line.arrow ? `url(#${arrowId}-${line.role})` : undefined}
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>
      <div className={`board-footer ${reasonPreview ? "is-teaching" : ""}`}>
        <span>{reasonPreview ? "PREVIEW / NOT PLAYED" : "NEON ARENA"}</span>
        <span>{reasonPreview ? coordLabel(reasonPreview.moveIndex) : "08 x 08"}</span>
        {reasonPreview && onClearPreview
          ? <button type="button" className="board-preview-exit" onClick={onClearPreview}>EXIT PREVIEW <span>ESC</span></button>
          : <span>{reasonPreview ? "NO MOVE PLAYED" : "REVERSI"}</span>}
      </div>
    </div>
  );
}

export const Board = memo(BoardComponent);
export { rowOf, colOf };
export type { Player };
