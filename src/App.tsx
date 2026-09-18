import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Board } from "./components/Board";
import { CoachPanel, DiscScoreHeader, EvalBar } from "./components/Panels";
import { MoveTable, type MovePly } from "./components/MoveTable";
import { GameOverOverlay, Icon, PauseOverlay, StartScreen } from "./components/Screens";
import { CourseModal } from "./components/Course";
import { SettingsModal } from "./components/SettingsModal";
import { MobileReasonPreview } from "./components/ReasonPreviewGuide";
import { useReasonPreview } from "./hooks/useReasonPreview";
import {
  applyMove,
  collectFlips,
  colOf,
  countDiscs,
  getValidMoves,
  hasAnyMove,
  other,
  rowOf,
  type Board as ReversiBoard,
  type Move,
  type Player,
} from "./game/reversi";
import { analyse, CORNERS, evaluate, ratingLabel, type AnalysisResult } from "./game/engine";
import { audio } from "./game/audio";
import { loadScores, saveScores, type HighScore, type Outcome } from "./game/scores";
import { BOARD_PRESETS, BOT_LEVELS, DEFAULT_SETTINGS, type GameSettings } from "./game/settings";

type Screen = "start" | "playing" | "paused" | "gameover";

type Particle = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  duration: number;
};

const PLAYER_COLOR = "#ff786c";
const RIVAL_COLOR = "#b9f4cf";
const AI_THINK_DELAY = 360;
const COACH_TIME_BUDGET = 160;
const COACH_DELAY = 140;

// Flip cascade timing — shared by the visuals and the audio so they stay in sync.
const FLIP_STEP_MS = 42;
const FLIP_MAX_DELAY = 420;
const FLIP_ANIM_MS = 540;

function chebyshev(a: number, b: number) {
  return Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)));
}

function buildFlipDelays(move: Move) {
  const map = new Map<number, number>();
  const ordered = [...move.flips].sort((a, b) => chebyshev(move.index, a) - chebyshev(move.index, b));
  ordered.forEach((square, i) => map.set(square, Math.min(i * FLIP_STEP_MS, FLIP_MAX_DELAY)));
  return map;
}

function gradeMove(
  ranked: Array<{ index: number; score: number }> | undefined,
  playedIndex: number,
): MovePly["grade"] {
  if (!ranked || ranked.length === 0) return undefined;
  const entry = ranked.find((candidate) => candidate.index === playedIndex);
  if (!entry) return undefined;
  const delta = ranked[0].score - entry.score;
  if (delta <= 1) return "BEST";
  if (delta <= 40) return "GOOD";
  if (delta <= 120) return "INACCURATE";
  return "MISTAKE";
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"coach" | "moves">("coach");
  const [muted, setMuted] = useState(audio.isMuted);

  const [board, setBoard] = useState<ReversiBoard>(() => BOARD_PRESETS[DEFAULT_SETTINGS.preset].create());
  const [startBoard, setStartBoard] = useState<ReversiBoard>(board);
  const [starterRef, setStarterRef] = useState<Player>(1);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [history, setHistory] = useState<MovePly[]>([]);
  const [view, setView] = useState<number | null>(null);

  const [inspected, setInspected] = useState<number | null>(null);
  const [p1Points, setP1Points] = useState(0);
  const [p2Points, setP2Points] = useState(0);
  const [recentFlips, setRecentFlips] = useState<number[]>([]);
  const [flipDelays, setFlipDelays] = useState<Map<number, number> | null>(null);
  const [lastPlaced, setLastPlaced] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [impact, setImpact] = useState<{ index: number; key: number } | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "warn" | "good" } | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [outcome, setOutcome] = useState<Outcome>("DRAW");
  const [highScores, setHighScores] = useState<HighScore[]>(loadScores);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [showHints, setShowHints] = useState(true);

  const aiTimer = useRef<number | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const passTimer = useRef<number | null>(null);
  const particleId = useRef(0);
  const travelSoundAt = useRef(0);
  const gameFinalized = useRef(false);

  const mode = settings.mode;
  const isPvp = mode === "pvp";
  const botConfig = BOT_LEVELS[settings.botLevel];
  const presetConfig = BOARD_PRESETS[settings.preset];
  const coachPlayer: Player = isPvp ? currentPlayer : 1;

  const isViewing = view !== null && view < history.length;
  const displayBoard = useMemo(
    () => (view === null || view >= history.length ? board : view === 0 ? startBoard : history[view - 1].board),
    [board, startBoard, history, view],
  );
  const displayDiscs = useMemo(() => countDiscs(displayBoard), [displayBoard]);
  const displayActive: Player = view !== null ? (view === 0 ? starterRef : other(history[view - 1].player)) : currentPlayer;
  const displayLastMove = view === null ? lastMove : view === 0 ? null : history[view - 1].index;

  const validMoves = useMemo(
    () => (screen === "playing" && !isViewing ? getValidMoves(board, isPvp ? currentPlayer : 1) : []),
    [board, isPvp, currentPlayer, screen, isViewing],
  );
  const liveDiscs = useMemo(() => countDiscs(board), [board]);
  const staticEval = useMemo(() => evaluate(displayBoard, 1), [displayBoard]);
  const coachScore = analysis && analysis.ranked.length > 0 ? analysis.ranked[0].score : null;
  const evalCenti =
    coachScore !== null && !isViewing && currentPlayer === coachPlayer && screen === "playing"
      ? coachScore * (coachPlayer === 1 ? 1 : -1)
      : staticEval;

  const clearAiTimer = useCallback(() => {
    if (aiTimer.current !== null) {
      window.clearTimeout(aiTimer.current);
      aiTimer.current = null;
    }
  }, []);

  const clearNotice = useCallback(() => {
    if (noticeTimer.current !== null) {
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    if (passTimer.current !== null) {
      window.clearTimeout(passTimer.current);
      passTimer.current = null;
    }
    setNotice(null);
  }, []);

  const flashNotice = useCallback((text: string, tone: "info" | "warn" | "good", duration = 2200) => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    setNotice({ text, tone });
    noticeTimer.current = window.setTimeout(() => setNotice(null), duration);
  }, []);

  // Audio context can only be created/resumed from a user gesture.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const emitBurst = useCallback((index: number, color: string, count = 10) => {
    const ids: number[] = [];
    const created: Particle[] = [];
    for (let step = 0; step < count; step += 1) {
      const id = particleId.current++;
      ids.push(id);
      const angle = (Math.PI * 2 * step) / count + Math.random() * 0.45;
      const speed = 18 + Math.random() * 34;
      created.push({
        id,
        x: ((colOf(index) + 0.5) / 8) * 100,
        y: ((rowOf(index) + 0.5) / 8) * 100,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        duration: 460 + Math.random() * 260,
      });
    }
    setParticles((current) => [...current, ...created]);
    window.setTimeout(() => setParticles((current) => current.filter((particle) => !ids.includes(particle.id))), 850);
  }, []);

  /** Placement impact: ripple + cascade of flips, with matching audio. */
  const playMoveFx = useCallback(
    (move: Move, player: Player) => {
      const delays = buildFlipDelays(move);
      const longest = Math.max(0, ...delays.values());
      const color = player === 1 ? PLAYER_COLOR : RIVAL_COLOR;

      setFlipDelays(delays);
      setRecentFlips(move.flips);
      setLastPlaced(move.index);
      setLastMove(move.index);
      setImpact({ index: move.index, key: particleId.current++ });

      audio.play("place");
      audio.cascade(move.flips.length, FLIP_STEP_MS);
      if (CORNERS.includes(move.index)) window.setTimeout(() => audio.play("corner"), 150);

      emitBurst(move.index, color, Math.min(20, 10 + move.flips.length));
      for (const flip of move.flips.slice(0, 6)) emitBurst(flip, color, 3);

      window.setTimeout(() => {
        setRecentFlips([]);
        setLastPlaced(null);
      }, longest + FLIP_ANIM_MS);
    },
    [emitBurst],
  );

  const finishGame = useCallback(
    (finalBoard: ReversiBoard, finalP1: number) => {
      if (gameFinalized.current) return;
      gameFinalized.current = true;
      const finalDiscs = countDiscs(finalBoard);
      const result: Outcome =
        finalDiscs.player > finalDiscs.ai ? "WIN" : finalDiscs.player < finalDiscs.ai ? "LOSS" : "DRAW";
      setBoard(finalBoard);
      setOutcome(result);
      setScreen("gameover");
      setView(null);
      setRightTab("moves");
      audio.play(result === "WIN" ? "win" : result === "LOSS" ? "lose" : "draw", 180);
      if (mode === "bot") {
        const entry: HighScore = {
          score: finalP1,
          result,
          date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        };
        setHighScores((current) => {
          const next = [...current, entry].sort((a, b) => b.score - a.score).slice(0, 5);
          saveScores(next);
          return next;
        });
      }
    },
    [mode],
  );

  const startGameWithSettings = useCallback(
    (customSettings: GameSettings = settings) => {
      clearAiTimer();
      clearNotice();
      gameFinalized.current = false;
      const newBoard = BOARD_PRESETS[customSettings.preset].create();
      let starter: Player = 1;
      if (customSettings.starter === "p2") starter = 2;
      else if (customSettings.starter === "random") starter = Math.random() < 0.5 ? 1 : 2;

      setBoard(newBoard);
      setStartBoard(newBoard);
      setStarterRef(starter);
      setCurrentPlayer(starter);
      setHistory([]);
      setView(null);
      setInspected(null);
      setP1Points(0);
      setP2Points(0);
      setRecentFlips([]);
      setFlipDelays(null);
      setLastPlaced(null);
      setLastMove(null);
      setImpact(null);
      setParticles([]);
      setAnalysis(null);
      setRightTab("coach");
      setScreen("playing");
      audio.play("start");
    },
    [clearAiTimer, clearNotice, settings],
  );

  const handleApplySettings = useCallback(
    (newSettings: GameSettings, restartNow: boolean) => {
      setSettings(newSettings);
      if (restartNow || screen === "start") startGameWithSettings(newSettings);
    },
    [screen, startGameWithSettings],
  );

  const returnToMenu = useCallback(() => {
    clearAiTimer();
    clearNotice();
    setScreen("start");
    setParticles([]);
    setRecentFlips([]);
    setLastPlaced(null);
    setAnalysis(null);
    setView(null);
  }, [clearAiTimer, clearNotice]);

  const sideName = useCallback(
    (player: Player) => (isPvp ? (player === 1 ? "PLAYER 1" : "PLAYER 2") : player === 1 ? "YOU" : "RIVAL"),
    [isPvp],
  );

  /** Records a ply (and the opponent's forced pass) into the history. */
  const applyPly = useCallback(
    (player: Player, move: Move | null, nextBoard: ReversiBoard, grade?: MovePly["grade"]) => {
      const points = move ? 100 + move.flips.length * 75 : 0;
      const discsAfter = countDiscs(nextBoard);
      const played: MovePly = {
        number: history.length + 1,
        player,
        index: move ? move.index : null,
        flips: move ? move.flips : [],
        board: nextBoard,
        points,
        discs: { player: discsAfter.player, ai: discsAfter.ai },
        grade,
        corner: move ? CORNERS.includes(move.index) : false,
      };
      let plies = [played];
      const next = other(player);
      const nextCanMove = hasAnyMove(nextBoard, next);
      const selfCanMove = hasAnyMove(nextBoard, player);

      if (!nextCanMove && selfCanMove) {
        plies = [
          ...plies,
          {
            number: history.length + 2,
            player: next,
            index: null,
            flips: [],
            board: nextBoard,
            points: 0,
            discs: { player: discsAfter.player, ai: discsAfter.ai },
            corner: false,
          },
        ];
      }

      const nextP1 = player === 1 ? p1Points + points : p1Points;
      const nextP2 = player === 2 ? p2Points + points : p2Points;

      setHistory((current) => [...current, ...plies]);
      setBoard(nextBoard);
      setView(null);
      setP1Points(nextP1);
      setP2Points(nextP2);
      setInspected(null);

      if (move) {
        playMoveFx(move, player);
        if (move.flips.length >= 8) flashNotice(`${sideName(player)} SWINGS ${move.flips.length} DISCS`, "good");
      }

      if (!nextCanMove && selfCanMove) {
        passTimer.current = window.setTimeout(() => {
          audio.play("pass");
          flashNotice(`${sideName(next)} HAS NO LEGAL MOVE — PASS`, "warn");
        }, 480);
      }

      if (!nextCanMove && !selfCanMove) finishGame(nextBoard, nextP1);
      else if (!nextCanMove) setCurrentPlayer(player);
      else setCurrentPlayer(next);
    },
    [finishGame, flashNotice, history.length, p1Points, p2Points, playMoveFx, sideName],
  );

  const handleCellClick = useCallback(
    (index: number) => {
      if (screen !== "playing" || isViewing || settingsOpen || courseOpen) return;
      if (isPvp ? false : currentPlayer !== 1) return;
      const actor: Player = isPvp ? currentPlayer : 1;
      const flips: number[] = [];
      if (!collectFlips(board, index, actor, flips)) {
        // Only nudge on squares that look playable but are not.
        if (board[index] === 0) audio.play("illegal");
        return;
      }
      const grade = isPvp || actor === 1 ? gradeMove(analysis?.ranked, index) : undefined;
      applyPly(actor, { index, flips }, applyMove(board, { index, flips }, actor), grade);
    },
    [analysis, applyPly, board, courseOpen, currentPlayer, isPvp, isViewing, screen, settingsOpen],
  );

  // Engine analysis for the coaching player (also powers move grading).
  useEffect(() => {
    if (screen !== "playing" || isViewing || settingsOpen || courseOpen || currentPlayer !== coachPlayer) {
      setAnalysis(null);
      setAnalysisPending(false);
      return;
    }
    setAnalysis(null);
    setAnalysisPending(true);
    const id = window.setTimeout(() => {
      const result = analyse(board, coachPlayer, { timeBudget: COACH_TIME_BUDGET, maxDepth: 8 });
      setAnalysis(result);
      setAnalysisPending(false);
    }, COACH_DELAY);
    return () => window.clearTimeout(id);
  }, [board, coachPlayer, currentPlayer, isViewing, screen, settingsOpen, courseOpen]);

  // Rival turn (bot mode only).
  useEffect(() => {
    if (mode !== "bot" || screen !== "playing" || currentPlayer !== 2 || isViewing || settingsOpen || courseOpen) return;
    const id = window.setTimeout(() => {
      const moves = getValidMoves(board, 2);
      if (moves.length === 0) {
        applyPly(2, null, board);
        return;
      }
      const result = analyse(board, 2, { timeBudget: botConfig.timeBudget, maxDepth: botConfig.depth });
      let chosen = result.best ?? moves[0].index;
      if (botConfig.randomFactor > 0 && result.ranked.length > 1 && Math.random() < botConfig.randomFactor) {
        chosen = result.ranked[Math.min(result.ranked.length - 1, 1 + Math.floor(Math.random() * 2))].index;
      }
      const move =
        moves.find((candidate) => candidate.index === chosen) ??
        [...moves].sort((a, b) => b.flips.length - a.flips.length)[0];
      applyPly(2, move, applyMove(board, move, 2), gradeMove(result.ranked, move.index));
    }, AI_THINK_DELAY);
    aiTimer.current = id;
    return clearAiTimer;
  }, [applyPly, board, botConfig, clearAiTimer, courseOpen, currentPlayer, isViewing, mode, screen, settingsOpen]);

  /** Truncate the game back to a past position (undo / rewind share this path). */
  const rewindTo = useCallback(
    (targetPly: number) => {
      clearAiTimer();
      const trimmed = history.slice(0, targetPly);
      const nextBoard = trimmed.length > 0 ? trimmed[trimmed.length - 1].board : startBoard;
      const p1 = trimmed.reduce((sum, ply) => sum + (ply.player === 1 ? ply.points : 0), 0);
      const p2 = trimmed.reduce((sum, ply) => sum + (ply.player === 2 ? ply.points : 0), 0);
      gameFinalized.current = false;
      setHistory(trimmed);
      setBoard(nextBoard);
      setView(null);
      setP1Points(p1);
      setP2Points(p2);
      setRecentFlips([]);
      setFlipDelays(null);
      setLastPlaced(null);
      setLastMove(trimmed.length > 0 ? trimmed[trimmed.length - 1].index : null);
      setImpact(null);
      setParticles([]);
      setInspected(null);
      setAnalysis(null);
      if (screen === "gameover") setScreen("playing");
      audio.play("undo");
      flashNotice(`REWOUND TO MOVE ${targetPly}`, "info", 1400);

      const next: Player = trimmed.length > 0 ? other(trimmed[trimmed.length - 1].player) : starterRef;
      if (!hasAnyMove(nextBoard, 1) && !hasAnyMove(nextBoard, 2)) {
        finishGame(nextBoard, p1);
      } else if (hasAnyMove(nextBoard, next)) {
        setCurrentPlayer(next);
      } else {
        setCurrentPlayer(other(next));
      }
    },
    [clearAiTimer, finishGame, flashNotice, history, screen, startBoard, starterRef],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    let target = history.length - 1;
    // In bot mode rewind a full exchange (bot reply + your move).
    if (!isPvp && history[target].player === 2 && target > 0) target -= 1;
    if (!isPvp && target > 0 && history[target].player === 2) target -= 1;
    rewindTo(target);
  }, [history, isPvp, rewindTo]);

  const travelSound = useCallback((direction: -1 | 1) => {
    const now = performance.now();
    if (now - travelSoundAt.current < 70) return;
    travelSoundAt.current = now;
    audio.play(direction === 1 ? "travelForward" : "travelBack");
  }, []);

  // Time travel: 0 = start position, history.length = live.
  const travel = useCallback(
    (delta: -1 | 1) => {
      if (screen !== "playing") return;
      setView((current) => {
        const at = current === null ? history.length : current;
        const next = Math.min(history.length, Math.max(0, at + delta));
        if (next === at) return current;
        travelSound(delta);
        return next === history.length ? null : next;
      });
    },
    [history.length, screen, travelSound],
  );

  const canPreview =
    screen === "playing" && !isViewing && showHints && !settingsOpen && !courseOpen && currentPlayer === coachPlayer;
  const { preview: reasonPreview, controls: reasonControls, clear: clearReasonPreview } = useReasonPreview(
    board,
    canPreview,
    history.length,
  );

  const toggleMute = useCallback(() => {
    audio.unlock();
    setMuted(audio.toggleMuted());
    if (!audio.isMuted) audio.play("hover");
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (courseOpen || settingsOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setCourseOpen(false);
          setSettingsOpen(false);
        }
        return;
      }
      if (event.key === "Escape" && reasonPreview) {
        event.preventDefault();
        clearReasonPreview();
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key;
      const isArrow = key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";
      // Focused controls keep their own keyboard behavior.
      if (target?.closest("button, a, [role='tab']") && isArrow) return;
      if (target?.closest("button") && (key === "Enter" || key === " ")) return;

      if (key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
        return;
      }
      if (screen === "start" && (key === "Enter" || key === " ")) {
        event.preventDefault();
        startGameWithSettings();
        return;
      }
      if (screen === "gameover") {
        if (key === "Enter" || key.toLowerCase() === "r") {
          event.preventDefault();
          startGameWithSettings();
        } else if (key.toLowerCase() === "u") {
          event.preventDefault();
          undo();
        }
        return;
      }
      if (screen === "paused") {
        if (key === "Escape" || key === "Enter") {
          event.preventDefault();
          setScreen("playing");
        } else if (key.toLowerCase() === "u") {
          event.preventDefault();
          undo();
          setScreen("playing");
        }
        return;
      }
      if (screen !== "playing") return;
      if (key === "Escape") {
        event.preventDefault();
        setScreen("paused");
        return;
      }
      if (key.toLowerCase() === "h") {
        event.preventDefault();
        setShowHints((value) => !value);
        return;
      }
      if (key.toLowerCase() === "u") {
        event.preventDefault();
        undo();
        return;
      }
      if (key.toLowerCase() === "r") {
        event.preventDefault();
        startGameWithSettings();
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        if (history.length > 0) {
          setView(0);
          travelSound(-1);
        }
        return;
      }
      if (key === "End") {
        event.preventDefault();
        if (view !== null) {
          setView(null);
          travelSound(1);
        }
        return;
      }
      // Arrow keys are time travel through the move history.
      if (isArrow) {
        event.preventDefault();
        travel(key === "ArrowUp" || key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearReasonPreview,
    courseOpen,
    history.length,
    reasonPreview,
    screen,
    settingsOpen,
    startGameWithSettings,
    toggleMute,
    travel,
    travelSound,
    undo,
    view,
  ]);

  const ratings = useMemo(() => {
    if (!showHints || !analysis || isViewing || currentPlayer !== coachPlayer) return null;
    const map = new Map<number, string>();
    for (const entry of analysis.ranked.slice(0, 3)) map.set(entry.index, ratingLabel(entry.score, analysis.forced));
    const focus = inspected ?? analysis.best;
    const focusEntry = analysis.ranked.find((entry) => entry.index === focus);
    if (focusEntry) map.set(focusEntry.index, ratingLabel(focusEntry.score, analysis.forced));
    return map;
  }, [analysis, inspected, isViewing, showHints, coachPlayer, currentPlayer]);

  const renderedParticles = particles.map((particle) => {
    const style = {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      backgroundColor: particle.color,
      "--dx": `${particle.dx}px`,
      "--dy": `${particle.dy}px`,
      "--duration": `${particle.duration}ms`,
    } as CSSProperties;
    return <span className="particle" key={particle.id} style={style} />;
  });

  const statusLabel = isViewing
    ? "HISTORY VIEW"
    : isPvp
      ? currentPlayer === 1
        ? "PLAYER 1 TO MOVE"
        : "PLAYER 2 TO MOVE"
      : currentPlayer === 1
        ? "YOUR TURN"
        : "RIVAL THINKING";
  const statusCopy = isViewing
    ? "↑ ↓ to browse · click a row or REWIND to HERE to keep this position."
    : isPvp
      ? "Shared mouse: click a glowing cell for the side to move."
      : "Click a glowing cell — hover any square to preview its flips.";
  const bestIndex =
    showHints && !isViewing && analysis?.best != null && currentPlayer === coachPlayer ? analysis.best : null;

  const gameOverHeadline: [string, string] | undefined = isPvp
    ? outcome === "WIN"
      ? ["PLAYER 1", "WINS."]
      : outcome === "LOSS"
        ? ["PLAYER 2", "WINS."]
        : ["GRID", "LOCKED."]
    : undefined;

  return (
    <div className="app-shell">
      <div className="grain" />
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={screen === "start" ? undefined : returnToMenu}
          aria-label="Return to Reversi home"
        >
          <BrandMark />
          <span>
            REVERSI <b>//</b> NEON ARENA
          </span>
        </button>
        <div className="topbar-right">
          <button
            className={`pause-button sound-toggle ${muted ? "is-off" : "is-on"}`}
            type="button"
            onClick={toggleMute}
            aria-pressed={!muted}
            title="Toggle sound (M)"
          >
            <Icon name={muted ? "muted" : "sound"} /> {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
          <button
            className="pause-button settings-trigger-btn"
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Opponent, bot level and board position"
          >
            <Icon name="gear" /> {isPvp ? "2P" : botConfig.badge}
          </button>
          <button className="pause-button course-button" type="button" onClick={() => setCourseOpen(true)}>
            <Icon name="book" /> MANUAL
          </button>
          {(screen === "playing" || screen === "paused" || screen === "gameover") && (
            <button
              className="pause-button"
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              title="Undo last move (U)"
            >
              <Icon name="undo" /> UNDO
            </button>
          )}
          {screen === "playing" && (
            <>
              <button
                className={`chip-toggle ${showHints ? "is-on" : ""}`}
                type="button"
                onClick={() => setShowHints((value) => !value)}
                aria-pressed={showHints}
              >
                <Icon name="spark" /> {showHints ? "COACH ON" : "COACH OFF"}
              </button>
              <button className="pause-button" type="button" onClick={() => setScreen("paused")}>
                <Icon name="pause" /> PAUSE
              </button>
            </>
          )}
        </div>
      </header>

      {screen === "start" && (
        <StartScreen
          onStart={() => startGameWithSettings()}
          onCourse={() => setCourseOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          settings={settings}
          scores={highScores}
        />
      )}

      {screen !== "start" && (
        <main className="game-screen">
          <section className="game-main">
            <div className="game-heading">
              <div>
                <div className="eyebrow">
                  <span className={`eyebrow-line ${currentPlayer === 2 ? "is-cool" : ""}`} />
                  <span>
                    TURN {String(history.length + 1).padStart(2, "0")} · {presetConfig.phaseTag}
                  </span>
                </div>
                <h1>
                  FLIP THE <em>FIELD.</em>
                </h1>
              </div>
              <div className={`turn-status ${currentPlayer === 2 && !isPvp ? "is-ai" : ""}`} aria-live="polite">
                <span className="status-dot" />
                <div>
                  <strong>{statusLabel}</strong>
                  <span>{statusCopy}</span>
                </div>
              </div>
            </div>

            {notice && (
              <div className={`board-notice tone-${notice.tone}`} role="status">
                <span className="notice-dot" />
                {notice.text}
              </div>
            )}

            {isViewing && (
              <div className="time-travel-bar" role="status">
                <span className="tt-label">⏱ TIME TRAVEL</span>
                <span className="tt-pos">
                  {view === 0 ? "START POSITION" : `MOVE ${view} OF ${history.length}`}
                </span>
                <button type="button" className="tt-btn" onClick={() => view !== null && rewindTo(view)}>
                  ↺ REWIND TO HERE
                </button>
                <button
                  type="button"
                  className="tt-btn is-live"
                  onClick={() => {
                    setView(null);
                    audio.play("travelForward");
                  }}
                >
                  ⏩ RETURN TO LIVE
                </button>
              </div>
            )}

            <DiscScoreHeader
              discs={displayDiscs}
              currentPlayer={displayActive}
              isPvp={isPvp}
              youPoints={view === null || view >= history.length ? p1Points : history.slice(0, view).reduce((s, p) => s + (p.player === 1 ? p.points : 0), 0)}
              rivalPoints={view === null || view >= history.length ? p2Points : history.slice(0, view).reduce((s, p) => s + (p.player === 2 ? p.points : 0), 0)}
              botLevelName={isPvp ? undefined : botConfig.name}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <div className="board-row">
              <div className={`board-stage ${isViewing ? "is-viewing" : ""}`}>
                <Board
                  id="match-board"
                  board={displayBoard}
                  validMoves={validMoves}
                  bestIndex={bestIndex}
                  showHints={showHints}
                  recentFlips={recentFlips}
                  flipDelays={flipDelays}
                  lastPlaced={lastPlaced}
                  lastMove={displayLastMove}
                  impact={impact}
                  interactive={screen === "playing" && !isViewing && (isPvp || currentPlayer === 1)}
                  previewPlayer={isPvp ? currentPlayer : 1}
                  ratings={ratings}
                  reasonPreview={reasonPreview}
                  onClearPreview={clearReasonPreview}
                  onCell={handleCellClick}
                  onInspect={(index) => {
                    if (index !== null && !reasonPreview) setInspected(index);
                  }}
                />
                <div className="particle-layer" aria-hidden="true">
                  {renderedParticles}
                </div>
              </div>
              <aside className="eval-column">
                <EvalBar
                  evalCenti={evalCenti}
                  depth={analysis?.depth ?? 0}
                  pending={analysisPending}
                  forced={analysis?.forced ?? false}
                  discs={displayDiscs}
                  youLabel={isPvp ? "P1" : "YOU"}
                  rivalLabel={isPvp ? "P2" : "RIVAL"}
                />
              </aside>
            </div>

            <div className="game-controls">
              <span><b>CLICK</b> PLAY</span>
              <span><b>↑ ↓</b> TIME TRAVEL</span>
              <span><b>HOME/END</b> START/LIVE</span>
              <span><b>U</b> UNDO</span>
              <span><b>M</b> SOUND</span>
              <span><b>ESC</b> PAUSE</span>
            </div>
          </section>

          <div className="right-column">
            <div className="right-tabbar" role="tablist" aria-label="Coach or move history">
              <button
                role="tab"
                aria-selected={rightTab === "coach"}
                type="button"
                className={rightTab === "coach" ? "is-active" : ""}
                onClick={() => setRightTab("coach")}
              >
                ENGINE COACH
              </button>
              <button
                role="tab"
                aria-selected={rightTab === "moves"}
                type="button"
                className={rightTab === "moves" ? "is-active" : ""}
                onClick={() => setRightTab("moves")}
              >
                MOVE HISTORY <span className="tab-count">{history.length}</span>
              </button>
            </div>

            {rightTab === "coach" ? (
              <CoachPanel
                board={board}
                player={coachPlayer}
                analysis={isViewing ? null : analysis}
                pending={analysisPending && !isViewing}
                showHints={showHints}
                inspected={isViewing ? null : inspected}
                onToggleHints={setShowHints}
                onPick={(index) => setInspected(index)}
                botLevelName={isPvp ? undefined : botConfig.name}
                onOpenSettings={() => setSettingsOpen(true)}
                reasonControls={reasonControls}
                reasonPreview={reasonPreview}
                onClearPreview={clearReasonPreview}
              />
            ) : (
              <MoveTable
                plies={history}
                view={view === null ? history.length : view}
                isPvp={isPvp}
                onTravel={(position) => {
                  if (position === null) audio.play("travelForward");
                  else audio.play("travelBack");
                  setView(position);
                }}
                onRewind={rewindTo}
              />
            )}
          </div>
        </main>
      )}

      {reasonPreview && (
        <MobileReasonPreview
          board={board}
          preview={reasonPreview}
          onClear={clearReasonPreview}
          onViewBoard={() => {
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            document.getElementById("match-board")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal currentSettings={settings} onApply={handleApplySettings} onClose={() => setSettingsOpen(false)} />
      )}

      {courseOpen && <CourseModal onClose={() => setCourseOpen(false)} />}

      {screen === "paused" && (
        <PauseOverlay
          onResume={() => setScreen("playing")}
          onRestart={() => startGameWithSettings()}
          onMenu={returnToMenu}
          onOpenSettings={() => setSettingsOpen(true)}
          onUndo={undo}
          canUndo={history.length > 0}
        />
      )}

      {screen === "gameover" && (
        <GameOverOverlay
          outcome={outcome}
          discs={liveDiscs}
          onRestart={() => startGameWithSettings()}
          onMenu={returnToMenu}
          onOpenSettings={() => setSettingsOpen(true)}
          onUndo={undo}
          canUndo={history.length > 0}
          scores={highScores}
          headline={gameOverHeadline}
        />
      )}
    </div>
  );
}
