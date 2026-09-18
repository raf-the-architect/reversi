import { useEffect, useRef } from "react";
import { coordLabel, type Board as ReversiBoard, type Player } from "../game/reversi";

export type MovePly = {
  number: number;
  player: Player;
  index: number | null; // null = pass
  flips: number[];
  /** Board position after this ply (time travel snapshots). */
  board: ReversiBoard;
  points: number;
  discs: { player: number; ai: number };
  /** Engine annotation computed from the search that was live when played. */
  grade?: "BEST" | "GOOD" | "INACCURATE" | "MISTAKE";
  corner?: boolean;
};

type MoveTableProps = {
  plies: MovePly[];
  /** 0..plies.length — 0 is the starting position. */
  view: number;
  isPvp: boolean;
  onTravel: (position: number | null) => void;
  onRewind: (position: number) => void;
};

const GRADE_CLASS: Record<NonNullable<MovePly["grade"]>, string> = {
  BEST: "grade-best",
  GOOD: "grade-good",
  INACCURATE: "grade-inaccurate",
  MISTAKE: "grade-mistake",
};

const GRADE_SHORT: Record<NonNullable<MovePly["grade"]>, string> = {
  BEST: "BEST",
  GOOD: "GOOD",
  INACCURATE: "INAC",
  MISTAKE: "MIST",
};

export function MoveTable({ plies, view, isPvp, onTravel, onRewind }: MoveTableProps) {
  const live = plies.length;
  const activeRef = useRef<HTMLLIElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [view, live]);

  // Keep the newest move visible automatically while the game is live.
  useEffect(() => {
    if (view === live && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [live, view]);

  const sideLabel = (player: Player) => (isPvp ? (player === 1 ? "P1" : "P2") : player === 1 ? "YOU" : "BOT");
  const active = view;

  return (
    <section className="move-table" aria-label="Move history">
      <div className="move-table-head">
        <span className="coach-kicker">MOVE HISTORY</span>
        <span className="move-table-hint">CLICK ROW = TIME TRAVEL · ↑ ↓ NAVIGATE</span>
      </div>

      <div className="move-table-columns" aria-hidden="true">
        <span>#</span>
        <span>SIDE</span>
        <span>SQ</span>
        <span>QUALITY</span>
        <span>FLIPPED DISCS</span>
        <span>PTS</span>
        <span>DISCS</span>
        <span>STATE</span>
      </div>

      {view < live && (
        <div className="rewind-bar">
          <span>{view === 0 ? "VIEWING START POSITION" : `VIEWING MOVE ${view} OF ${live}`}</span>
          <div className="rewind-actions">
            <button type="button" className="tt-btn" onClick={() => onRewind(view)}>
              ↺ REWIND TO HERE
            </button>
            <button type="button" className="tt-btn is-live" onClick={() => onTravel(null)}>
              ⏩ RETURN TO LIVE
            </button>
          </div>
        </div>
      )}

      <ol className="move-list" ref={listRef}>
        <li ref={active === 0 ? activeRef : undefined}>
          <button
            type="button"
            className={`move-row mt-start ${active === 0 ? "is-viewed" : ""} ${live === 0 ? "is-live" : ""}`}
            onClick={() => onTravel(active === 0 ? null : 0)}
          >
            <span className="mt-num">00</span>
            <span className="mt-side mt-p1">START</span>
            <span className="mt-sq mt-pass">—</span>
            <span className="mt-grade" />
            <span className="mt-flips" aria-hidden="true" />
            <span className="mt-pts">+0</span>
            <span className="mt-discs">02:02</span>
            <span className="mt-state">{live === 0 ? <em className="mt-live">LIVE</em> : <em>START</em>}</span>
          </button>
        </li>

        {plies.map((ply) => {
          const isActive = active === ply.number;
          const isLiveRow = ply.number === live;
          const isPass = ply.index === null;
          const shown = ply.flips.slice(0, 4);
          return (
            <li key={ply.number} ref={isActive ? activeRef : undefined}>
              <button
                type="button"
                className={`move-row ${isPass ? "is-pass" : ""} ${isActive ? "is-viewed" : ""} ${isLiveRow ? "is-live is-newest" : ""}`}
                onClick={() => onTravel(isActive && !isLiveRow ? null : isLiveRow ? null : ply.number)}
                aria-label={`Move ${ply.number} by ${sideLabel(ply.player)}${isPass || ply.index === null ? ", pass" : ` to ${coordLabel(ply.index)}`}, flips ${ply.flips.length} discs, ${ply.points} points, disc count ${ply.discs.player} to ${ply.discs.ai}${ply.grade ? `, engine quality ${ply.grade.toLowerCase()}` : ""}${isLiveRow ? ", current position" : ""}`}
              >
                <span className="mt-num">{String(ply.number).padStart(2, "0")}</span>
                <span className={`mt-side ${ply.player === 1 ? "mt-p1" : "mt-p2"}`}>{sideLabel(ply.player)}</span>
                <span className="mt-sq">
                  {isPass || ply.index === null ? "PASS" : coordLabel(ply.index)}
                  {ply.corner && <i className="mt-star" title="Corner capture">★</i>}
                </span>
                <span className={`mt-grade ${ply.grade ? GRADE_CLASS[ply.grade] : ""}`}>
                  {ply.grade ? GRADE_SHORT[ply.grade] : "—"}
                </span>
                <span className="mt-flips">
                  {isPass
                    ? "— no reply available"
                    : shown.map((flip) => <em key={flip}>{coordLabel(flip)}</em>)}
                  {!isPass && ply.flips.length > 4 && <em className="mt-more">+{ply.flips.length - 4}</em>}
                  {!isPass && ply.flips.length === 0 && <em className="mt-none">—</em>}
                </span>
                <span className="mt-pts">{ply.points > 0 ? `+${ply.points}` : "+0"}</span>
                <span className="mt-discs">
                  {String(ply.discs.player).padStart(2, "0")}:{String(ply.discs.ai).padStart(2, "0")}
                </span>
                <span className="mt-state">
                  {isLiveRow
                    ? <em className="mt-live">LIVE</em>
                    : isActive
                      ? <em className="mt-viewed">VIEWED</em>
                      : <em>{ply.grade ? `${ply.flips.length} FLIP${ply.flips.length === 1 ? "" : "S"}` : `${String(ply.discs.player + ply.discs.ai).padStart(2, "0")} DISCS`}</em>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
