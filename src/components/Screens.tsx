import { Board } from "./Board";
import { ScoreList } from "./Panels";
import { createInitialBoard, getValidMoves, type Board as ReversiBoard } from "../game/reversi";
import { formatScore, type HighScore, type Outcome } from "../game/scores";
import { BOT_LEVELS, BOARD_PRESETS, type GameSettings } from "../game/settings";

export type IconName =
  | "pause" | "play" | "refresh" | "arrow" | "spark" | "book" | "gear" | "undo" | "sound" | "muted" | "clock";

function Icon({ name }: { name: IconName }) {
  if (name === "pause") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12" /></svg>;
  if (name === "play") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 8 6-8 6V4Z" /></svg>;
  if (name === "refresh") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 7V3m0 0h-4m4 0-3 3a6 6 0 1 0 1.4 7" /></svg>;
  if (name === "arrow") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>;
  if (name === "book") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5c-1.5-1.2-3.3-1.7-5.5-1.7V15c2.2 0 4 .5 5.5 1.7 1.5-1.2 3.3-1.7 5.5-1.7V3.3C13.3 3.3 11.5 3.8 10 5ZM10 5v11.7" /></svg>;
  if (name === "gear") return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="2.6" /><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M15.3 4.7l-1.6 1.6M6.3 13.7l-1.6 1.6" /></svg>;
  if (name === "undo") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5 3.5 8.5 7 12" /><path d="M3.5 8.5H12a4.5 4.5 0 0 1 0 9H8" /></svg>;
  if (name === "sound") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8v4h3l4 3V5L7 8H4Z" /><path d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6 6 0 0 1 0 9" /></svg>;
  if (name === "muted") return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8v4h3l4 3V5L7 8H4Z" /><path d="m13 8 4 4M17 8l-4 4" /></svg>;
  if (name === "clock") return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 2" /></svg>;
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v4M10 14v4M2 10h4M14 10h4M5 5l2 2M13 13l2 2M15 5l-2 2M7 13l-2 2" /></svg>;
}

export function StartScreen({
  onStart,
  onCourse,
  onOpenSettings,
  settings,
  scores,
}: {
  onStart: () => void;
  onCourse: () => void;
  onOpenSettings: () => void;
  settings: GameSettings;
  scores: HighScore[];
}) {
  const preview: ReversiBoard = createInitialBoard();
  const isPvp = settings.mode === "pvp";
  const opponentLabel = isPvp ? "2P LOCAL DUEL" : BOT_LEVELS[settings.botLevel].name;
  const presetInfo = BOARD_PRESETS[settings.preset];

  return (
    <main className="start-screen">
      <section className="start-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> {isPvp ? "PASS & PLAY" : "QUICK MATCH"} / LOCAL DUEL</div>
        <h1>READ<br /><em>THE TIDE.</em></h1>
        <p className="lead-copy">A fast, tactile Reversi duel. Click glowing squares to play, hover the coach to see why, and use the move history to travel back in time.</p>

        <div className="match-pill-card">
          <div className="match-pill-left">
            <span className="pill-kicker">ACTIVE CONFIG</span>
            <div className="pill-details">
              <strong>{opponentLabel}</strong>
              <span>· {settings.starter === "random" ? "Random starter" : `${isPvp ? "Player" : settings.starter === "p1" ? "You" : "Bot"} (P${settings.starter === "p1" ? 1 : 2}) start`}</span>
              <span>· {presetInfo.name}</span>
            </div>
          </div>
          <button type="button" className="pill-change-btn" onClick={onOpenSettings}>
            <Icon name="gear" /> CUSTOMIZE
          </button>
        </div>

        <div className="start-actions">
          <div className="start-action-row">
            <button className="button button-primary" type="button" onClick={onStart}><Icon name="play" /><span>START MATCH</span><kbd>ENTER</kbd></button>
            <button className="button button-secondary course-cta" type="button" onClick={onOpenSettings}><Icon name="gear" /> GAME SETTINGS</button>
            <button className="button button-secondary course-cta" type="button" onClick={onCourse}><Icon name="book" /> FIELD MANUAL</button>
          </div>
          <div className="control-note"><span className="control-key">MOUSE</span> PLAY <span className="control-key">↑ ↓</span> TIME TRAVEL <span className="control-key">U</span> UNDO</div>
        </div>

        <ul className="feature-list">
          <li><Icon name="spark" /><span><b>Move history &amp; time travel</b> — every move, flips and points, replay any past position.</span></li>
          <li><Icon name="spark" /><span><b>Undo &amp; rewind</b> — undo a move or rewind the game to any move in the table.</span></li>
          <li><Icon name="spark" /><span><b>Play vs human</b> — pass and play on one board, or face four bot depths.</span></li>
        </ul>
        <div className="start-rule" />
        <div className="micro-stats">
          <div><strong>08</strong><span>LINES</span></div>
          <div><strong>64</strong><span>CELLS</span></div>
          <div><strong>{scores.length ? formatScore(scores[0].score) : "----"}</strong><span>BEST SCORE</span></div>
        </div>
      </section>
      <section className="start-board-area">
        <div className="preview-heading"><span className="status-dot" /> BOARD READY <span>{isPvp ? "P1 / P2" : `${BOT_LEVELS[settings.botLevel].badge} / P2`}</span></div>
        <Board board={preview} validMoves={getValidMoves(preview, 1)} bestIndex={null} showHints={false} recentFlips={[]} lastPlaced={null} interactive={false} ratings={null} onCell={() => undefined} onInspect={() => undefined} />
        <div className="preview-caption"><span>FIRST MOVE WINS MOMENTUM</span><span className="caption-arrow"><Icon name="arrow" /></span></div>
      </section>
      <div className="start-ledger"><ScoreList scores={scores} compact /></div>
    </main>
  );
}

export function PauseOverlay({ onResume, onRestart, onMenu, onOpenSettings, onUndo, canUndo }: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onOpenSettings: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  return (
    <div className="modal-layer">
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <div className="modal-kicker"><span className="status-dot is-warm" /> MATCH ON HOLD</div>
        <h2 id="pause-title">KEEP<br /><em>YOUR EDGE.</em></h2>
        <p>The board is frozen. Undo a move, review settings, or get back to the corners.</p>
        <div className="modal-actions">
          <button className="button button-primary" type="button" onClick={onResume}><Icon name="play" /> RESUME <kbd>ESC</kbd></button>
          <button className="button button-secondary" type="button" onClick={onUndo} disabled={!canUndo}><Icon name="undo" /> UNDO MOVE <kbd>U</kbd></button>
          <button className="button button-secondary" type="button" onClick={onOpenSettings}><Icon name="gear" /> MATCH SETTINGS</button>
          <button className="button button-secondary" type="button" onClick={onRestart}><Icon name="refresh" /> RESTART MATCH</button>
          <button className="text-button" type="button" onClick={onMenu}>RETURN TO MENU</button>
        </div>
      </div>
    </div>
  );
}

export function GameOverOverlay({
  outcome,
  discs,
  onRestart,
  onMenu,
  onOpenSettings,
  onUndo,
  canUndo,
  scores,
  headline,
  lesson,
}: {
  outcome: Outcome;
  discs: { player: number; ai: number };
  onRestart: () => void;
  onMenu: () => void;
  onOpenSettings: () => void;
  onUndo: () => void;
  canUndo: boolean;
  scores: HighScore[];
  headline?: [string, string];
  lesson?: string;
}) {
  const defaultHeadline = outcome === "WIN" ? ["BOARD", "CLAIMED."] : outcome === "LOSS" ? ["TIDE", "TURNED."] : ["GRID", "LOCKED."];
  const title = headline ?? defaultHeadline;
  return (
    <div className="modal-layer is-gameover">
      <div className="modal-box gameover-box" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <div className={`modal-kicker outcome-${outcome.toLowerCase()}`}><span className="status-dot" /> MATCH COMPLETE / {outcome}</div>
        <h2 id="gameover-title"><em>{title[0]}</em><br /><em>{title[1]}</em></h2>
        <div className="result-row is-two-col">
          <div><span>YOUR FINAL DISCS</span><strong>{String(discs.player).padStart(2, "0")}</strong></div>
          <div><span>RIVAL FINAL DISCS</span><strong>{String(discs.ai).padStart(2, "0")}</strong></div>
        </div>
        <p className="coach-lesson">
          {lesson ?? (discs.player >= discs.ai
            ? "Solid victory! Try a harder bot depth, or rewind to a branching move and explore the line you missed."
            : "The rival outplayed the corners. Rewind to the first big swing in the move table and compare it with the coach's best move.")}
        </p>
        <div className="modal-actions">
          <button className="button button-primary" type="button" onClick={onRestart}><Icon name="refresh" /> PLAY AGAIN <kbd>ENTER</kbd></button>
          <button className="button button-secondary" type="button" onClick={onUndo} disabled={!canUndo}><Icon name="undo" /> UNDO LAST MOVE <kbd>U</kbd></button>
          <button className="button button-secondary" type="button" onClick={onOpenSettings}><Icon name="gear" /> CHANGE LEVEL / POSITION</button>
          <button className="text-button" type="button" onClick={onMenu}>RETURN TO MENU</button>
        </div>
        <ScoreList scores={scores} compact />
      </div>
    </div>
  );
}

export { Icon };
