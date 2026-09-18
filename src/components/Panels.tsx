import { useMemo } from "react";
import { coordLabel, type Board, type Player } from "../game/reversi";
import { evalPercentage, explainMove, moveTags, ratingLabel, type AnalysisResult, type Reason } from "../game/engine";
import { formatScore, type HighScore } from "../game/scores";
import type { ReasonPreview } from "../game/coachPreview";
import type { ReasonControls } from "../hooks/useReasonPreview";
import { ReasonButton } from "./ReasonButton";
import { ReasonPreviewGuide } from "./ReasonPreviewGuide";

export function ScoreList({ scores, compact = false }: { scores: HighScore[]; compact?: boolean }) {
  return (
    <div className={`score-list ${compact ? "is-compact" : ""}`}>
      <div className="section-label">
        <span>LOCAL LEDGER</span>
        <span className="section-rule" />
        <span className="section-count">TOP 05</span>
      </div>
      {scores.length === 0 ? (
        <div className="empty-ledger">No runs logged yet. Make the first mark.</div>
      ) : (
        <ol>
          {scores.map((entry, index) => (
            <li key={`${entry.date}-${entry.score}-${index}`}>
              <span className="rank">0{index + 1}</span>
              <span className={`result-dot result-${entry.result.toLowerCase()}`} />
              <span className="score-result">{entry.result}</span>
              <span className="score-date">{entry.date}</span>
              <strong>{formatScore(entry.score)}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function DiscScoreHeader({
  discs,
  currentPlayer,
  isPvp,
  youPoints,
  rivalPoints,
  botLevelName,
  onOpenSettings,
}: {
  discs: { player: number; ai: number; empty: number };
  currentPlayer: Player;
  isPvp: boolean;
  youPoints: number;
  rivalPoints: number;
  botLevelName?: string;
  onOpenSettings?: () => void;
}) {
  const total = Math.max(1, discs.player + discs.ai);
  const playerPct = (discs.player / total) * 100;

  return (
    <div className="disc-header" role="region" aria-label="Disc counts and turn">
      <div className={`disc-chip disc-chip-player ${currentPlayer === 1 ? "is-active-turn" : ""}`}>
        <span className="mini-disc mini-player" />
        <div className="disc-chip-text">
          <span className="disc-chip-label">{isPvp ? "PLAYER 1 (CORAL)" : "YOU (P1)"}</span>
          <strong className="disc-chip-count">{String(discs.player).padStart(2, "0")}</strong>
          <span className="disc-chip-points">PTS {String(youPoints).padStart(3, "0")}</span>
        </div>
        {currentPlayer === 1 && <span className="turn-pill">MOVE</span>}
      </div>

      <div className="disc-header-center">
        <div className="disc-header-meter" title={`Player ${Math.round(playerPct)}% vs Rival ${Math.round(100 - playerPct)}%`}>
          <span className="disc-meter-fill" style={{ width: `${playerPct}%` }} />
        </div>
        <div className="disc-header-sub">
          <span>{discs.empty} EMPTIES</span>
          {botLevelName && (
            <button
              type="button"
              className="bot-level-trigger"
              onClick={onOpenSettings}
              title="Change bot difficulty or position"
            >
              ⚙ {botLevelName}
            </button>
          )}
        </div>
      </div>

      <div className={`disc-chip disc-chip-ai ${currentPlayer === 2 ? "is-active-turn" : ""}`}>
        {currentPlayer === 2 && <span className="turn-pill is-ai">{isPvp ? "MOVE" : "THINK"}</span>}
        <div className="disc-chip-text is-right">
          <span className="disc-chip-label">{isPvp ? "PLAYER 2 (MINT)" : "RIVAL (BOT)"}</span>
          <strong className="disc-chip-count">{String(discs.ai).padStart(2, "0")}</strong>
          <span className="disc-chip-points">PTS {String(rivalPoints).padStart(3, "0")}</span>
        </div>
        <span className="mini-disc mini-ai" />
      </div>
    </div>
  );
}

export function EvalBar({
  evalCenti,
  depth,
  pending,
  forced,
  discs,
  youLabel,
  rivalLabel,
}: {
  evalCenti: number;
  depth: number;
  pending: boolean;
  forced: boolean;
  discs: { player: number; ai: number };
  youLabel?: string;
  rivalLabel?: string;
}) {
  const percent = evalPercentage(evalCenti);
  const label = ratingLabel(evalCenti, forced);
  const playerAhead = evalCenti >= 0;
  const status = forced
    ? evalCenti > 0
      ? "FORCED WIN"
      : evalCenti < 0
        ? "FORCED LOSS"
        : "DEAD EVEN"
    : evalCenti > 120
      ? (youLabel ?? "YOU") + " BETTER"
      : evalCenti < -120
        ? (rivalLabel ?? "RIVAL") + " BETTER"
        : "EQUAL";

  return (
    <div className="eval-rail" aria-label="Position evaluation">
      <div className="eval-head">
        <span>{rivalLabel ?? "RIVAL"}</span>
        <strong>{!playerAhead ? label : ""}</strong>
      </div>
      <div className={`eval-bar ${pending ? "is-pending" : ""}`}>
        <div className="eval-fill-rival" style={{ height: `${100 - percent}%` }} />
        <div className="eval-fill-player" style={{ height: `${percent}%` }}>
          <span className="eval-marker" />
        </div>
        <div className="eval-notch" style={{ bottom: `${percent}%` }} />
      </div>
      <div className="eval-head is-bottom">
        <strong>{playerAhead ? label : ""}</strong>
        <span>{youLabel ?? "YOU"}</span>
      </div>
      <div className={`eval-status ${!playerAhead ? "is-rival" : ""}`}>{status}</div>
      <div className="eval-meta">
        <span>{depth > 0 ? `D${depth}` : "STATIC"}</span>
        <span>
          {String(discs.player).padStart(2, "0")}:{String(discs.ai).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function ReasonList({ reasons, controls }: { reasons: Reason[]; controls: ReasonControls }) {
  return (
    <ul className="reason-list">
      {reasons.map((reason) => (
        <li key={reason.id}>
          <ReasonButton reason={reason} controls={controls} />
        </li>
      ))}
    </ul>
  );
}

export function CoachPanel({
  board,
  player,
  analysis,
  pending,
  showHints,
  inspected,
  onToggleHints,
  onPick,
  botLevelName,
  onOpenSettings,
  reasonControls,
  reasonPreview,
  onClearPreview,
}: {
  board: Board;
  player: Player;
  analysis: AnalysisResult | null;
  pending: boolean;
  showHints: boolean;
  inspected: number | null;
  onToggleHints: (value: boolean) => void;
  onPick: (index: number) => void;
  botLevelName?: string;
  onOpenSettings?: () => void;
  reasonControls: ReasonControls;
  reasonPreview: ReasonPreview | null;
  onClearPreview: () => void;
}) {
  const focusIndex = inspected ?? (analysis?.best != null ? analysis.best : null);
  const focusReasons = useMemo(
    () => (focusIndex === null ? [] : explainMove(board, focusIndex, player)),
    [board, focusIndex, player],
  );
  const bestReasons = useMemo(() => {
    if (!analysis?.best && analysis?.best !== 0) return [];
    return explainMove(board, analysis!.best!, player);
  }, [analysis, board, player]);

  const candidates = useMemo(() => {
    if (!analysis) return [];
    return analysis.ranked.slice(0, 5).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      tags: moveTags(board, entry.index, player),
      reason: explainMove(board, entry.index, player)[0],
    }));
  }, [analysis, board, player]);

  const focusScore = analysis?.ranked.find((entry) => entry.index === focusIndex)?.score ?? null;
  const bestScore = analysis?.ranked[0]?.score ?? 0;
  const delta = focusScore === null ? null : focusScore - bestScore;

  return (
    <section className={`coach ${showHints ? "" : "is-muted"}`}>
      <header className="coach-head">
        <div>
          <div className="coach-title-row">
            <span className="coach-kicker">ENGINE COACH &amp; TACTICAL RADAR</span>
            {botLevelName && (
              <button
                type="button"
                className="coach-settings-btn"
                onClick={onOpenSettings}
                title="Change bot strength or start position"
              >
                ⚙ {botLevelName}
              </button>
            )}
          </div>
          <span className="coach-sub">
            {showHints ? "Hover any reason to see it on the board. Click or tap to pin." : "Turn on hints to explore visual explanations."}
          </span>
        </div>
        <div className="coach-tools">
          <span className={`coach-chip ${pending ? "is-busy" : ""}`}>
            {pending
              ? "SEARCHING TREE…"
              : analysis
                ? `DEPTH ${analysis.depth} · ${Math.round(analysis.nodes / 1000)}k NODES · ${Math.round(analysis.time)}MS`
                : "IDLE"}
          </span>
          <button
            className={`toggle-button ${showHints ? "is-on" : ""}`}
            type="button"
            onClick={() => onToggleHints(!showHints)}
            aria-pressed={showHints}
          >
            <span className="toggle-track">
              <span className="toggle-knob" />
            </span>
            HINTS
            <kbd>H</kbd>
          </button>
        </div>
      </header>

      {analysis && analysis.best !== null && (
        <div className="coach-best">
          <button
            className="coach-best-button"
            type="button"
            onClick={() => onPick(analysis.best!)}
            title="Snap cursor to best move"
          >
            <span className="coord">{coordLabel(analysis.best)}</span>
            <span className="rating">{ratingLabel(bestScore, analysis.forced)}</span>
          </button>
          <div className="coach-best-copy">
            <span className="coach-kicker is-best">BEST MOVE · {coordLabel(analysis.best)}</span>
            {bestReasons[0] && <ReasonButton reason={bestReasons[0]} controls={reasonControls} compact />}
          </div>
        </div>
      )}

      {pending && (
        <div className="coach-pending">
          <span />
          <span />
          <span />
        </div>
      )}

      <div className="coach-columns">
        <div className="coach-col">
          <span className="section-label">
            <span>TOP RANKED CANDIDATES</span>
            <span className="section-rule" />
          </span>
          {candidates.length === 0 ? (
            <p className="coach-empty">{pending ? "Searching the tree..." : "Visual coaching returns on your next turn."}</p>
          ) : (
            <ol className="candidate-list">
              {candidates.map((entry) => (
                <li key={entry.index} className={entry.rank === 1 ? "is-top" : ""}>
                  <button className="candidate-pick" type="button" onClick={() => onPick(entry.index)}>
                    <span className="cand-rank">0{entry.rank}</span>
                    <span className="cand-coord">{coordLabel(entry.index)}</span>
                    <span className="cand-rating">{ratingLabel(entry.score, analysis?.forced ?? false)}</span>
                  </button>
                  <div className="cand-tags">
                    {entry.tags.map((tag) => (
                      <span key={tag} className={`cand-tag tag-${tag.toLowerCase().replace("-risk", "")}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {entry.reason && <ReasonButton reason={entry.reason} controls={reasonControls} compact />}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="coach-col">
          <span className="section-label">
            <span>
              {focusIndex === null
                ? "NO MOVE SELECTED"
                : inspected !== null
                  ? `INSPECTED MOVE · ${coordLabel(focusIndex)}`
                  : `BEST MOVE · ${coordLabel(focusIndex)}`}
            </span>
            <span className="section-rule" />
          </span>
          {delta !== null && (
            <div className={`coach-delta ${delta >= -25 ? "is-ok" : "is-bad"}`}>
              {delta >= -25
                ? "Matches the engine plan"
                : `${ratingLabel(Math.abs(delta), false).replace("+", "")} worse than the best move`}
            </div>
          )}
          {delta === null && <div className="coach-delta is-idle">{pending ? "Analyzing this move..." : "Select a glowing cell to explore it."}</div>}
          <ReasonList reasons={focusReasons} controls={reasonControls} />
        </div>
      </div>
      <ReasonPreviewGuide
        preview={reasonPreview}
        pinned={reasonControls.activeId !== null && reasonControls.activeId === reasonControls.pinnedId}
        onClear={onClearPreview}
      />
    </section>
  );
}
