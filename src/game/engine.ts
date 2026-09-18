import {
  applyMove,
  colOf,
  coordLabel,
  countDiscs,
  discDiff,
  getValidMoves,
  hasAnyMove,
  other,
  rowOf,
  type Board,
  type Move,
  type Player,
} from "./reversi";
import { getStableEdgeSquares } from "./position";

export const CORNERS = [0, 7, 56, 63];
export const X_SQUARES = [9, 14, 49, 54];
export const C_SQUARES = [1, 6, 8, 15, 48, 55, 57, 62];

const EDGE_CELLS = [1, 2, 3, 4, 5, 6, 8, 16, 24, 32, 40, 48, 15, 23, 31, 39, 47, 55, 57, 58, 59, 60, 61, 62];
const CORNER_OWNER: Record<number, number> = { 9: 0, 14: 7, 49: 56, 54: 63 };
const C_OWNER: Record<number, number> = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };

const INF = 1_000_000;
const WIN_BASE = 20_000;

export type ReasonKind =
  | "legal"
  | "corner"
  | "edge"
  | "corner-risk"
  | "pass"
  | "rival-mobility"
  | "corner-access"
  | "your-mobility"
  | "flips"
  | "stability"
  | "frontier";

export type Reason = {
  id: string;
  kind: ReasonKind;
  moveIndex: number;
  player: Player;
  tone: "good" | "bad" | "warn" | "info";
  text: string;
};

export type AnalysisResult = {
  best: number | null;
  ranked: Array<{ index: number; score: number }>;
  depth: number;
  nodes: number;
  time: number;
  forced: boolean;
};

export type PositionStats = {
  empties: number;
  mobility: number;
  rivalMobility: number;
  corners: number;
  rivalCorners: number;
  stable: number;
  rivalStable: number;
  frontier: number;
  rivalFrontier: number;
};

export function isCorner(index: number) {
  return CORNERS.includes(index);
}

export function isEdge(index: number) {
  const row = rowOf(index);
  const col = colOf(index);
  return row === 0 || row === 7 || col === 0 || col === 7;
}

function frontierDiscs(board: Board, player: Player) {
  let total = 0;
  for (let index = 0; index < 64; index += 1) {
    if (board[index] !== player) continue;
    const row = rowOf(index);
    const col = colOf(index);
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        if (board[r * 8 + c] === 0) {
          total += 1;
          dr = 2;
          break;
        }
      }
    }
  }
  return total;
}

function stableDiscs(board: Board, player: Player) {
  return getStableEdgeSquares(board, player).length;
}

function potentialMobility(board: Board, player: Player) {
  const opponent = other(player);
  let total = 0;
  for (let index = 0; index < 64; index += 1) {
    if (board[index] !== 0) continue;
    const row = rowOf(index);
    const col = colOf(index);
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        if (board[r * 8 + c] === opponent) {
          total += 1;
          dr = 2;
          break;
        }
      }
    }
  }
  return total;
}

export function positionStats(board: Board, player: Player = 1): PositionStats {
  const rival = other(player);
  let corners = 0;
  let rivalCorners = 0;
  for (const index of CORNERS) {
    if (board[index] === player) corners += 1;
    else if (board[index] === rival) rivalCorners += 1;
  }
  return {
    empties: countDiscs(board).empty,
    mobility: getValidMoves(board, player).length,
    rivalMobility: getValidMoves(board, rival).length,
    corners,
    rivalCorners,
    stable: stableDiscs(board, player),
    rivalStable: stableDiscs(board, rival),
    frontier: frontierDiscs(board, player),
    rivalFrontier: frontierDiscs(board, rival),
  };
}

/**
 * Static evaluation in "centi-discs": +100 is roughly one disc of advantage
 * for `player`. Positive = good for `player`.
 */
export function evaluate(board: Board, player: Player): number {
  const rival = other(player);
  const counts = countDiscs(board);
  const mine = player === 1 ? counts.player : counts.ai;
  const theirs = player === 1 ? counts.ai : counts.player;
  const progress = Math.min(1, Math.max(0, (60 - counts.empty) / 60));

  const discWeight = 8 + 92 * progress * progress;
  const mobilityWeight = 92 - 56 * progress;
  const potentialWeight = 12 - 5 * progress;
  const frontierWeight = -7 - 3 * progress;
  const stableWeight = 58 - 18 * progress;
  const cornerWeight = 175;
  const edgeWeight = 13;
  const xWeight = -46 * (1 - progress);
  const cWeight = -15 * (1 - progress);

  let score = (mine - theirs) * discWeight;

  score += (getValidMoves(board, player).length - getValidMoves(board, rival).length) * mobilityWeight;
  score += (potentialMobility(board, player) - potentialMobility(board, rival)) * potentialWeight;
  score += (frontierDiscs(board, player) - frontierDiscs(board, rival)) * frontierWeight;
  score += (stableDiscs(board, player) - stableDiscs(board, rival)) * stableWeight;

  let cornerDiff = 0;
  for (const index of CORNERS) {
    if (board[index] === player) cornerDiff += 1;
    else if (board[index] === rival) cornerDiff -= 1;
  }
  score += cornerDiff * cornerWeight;

  let edgeDiff = 0;
  for (const index of EDGE_CELLS) {
    if (board[index] === player) edgeDiff += 1;
    else if (board[index] === rival) edgeDiff -= 1;
  }
  score += edgeDiff * edgeWeight;

  for (const index of X_SQUARES) {
    const corner = CORNER_OWNER[index];
    if (board[corner] !== 0) continue;
    if (board[index] === player) score += xWeight;
    else if (board[index] === rival) score -= xWeight;
  }
  for (const index of C_SQUARES) {
    const corner = C_OWNER[index];
    if (board[corner] !== 0) continue;
    if (board[index] === player) score += cWeight;
    else if (board[index] === rival) score -= cWeight;
  }

  return score;
}

const SQUARE_VALUE = new Int16Array(64);
(function buildSquareValues() {
  for (let index = 0; index < 64; index += 1) {
    let value = 1;
    if (CORNERS.includes(index)) value = 120;
    else if (X_SQUARES.includes(index)) value = -30;
    else if (C_SQUARES.includes(index)) value = -12;
    else if (isEdge(index)) value = 12;
    SQUARE_VALUE[index] = value;
  }
})();

function orderMoves(moves: Move[]) {
  moves.sort((a, b) => SQUARE_VALUE[b.index] - SQUARE_VALUE[a.index] || a.flips.length - b.flips.length);
}

type SearchContext = {
  nodes: number;
  aborted: boolean;
  deadline: number;
};

function terminalScore(board: Board, player: Player) {
  const diff = discDiff(board, player);
  if (diff > 0) return WIN_BASE + diff * 100;
  if (diff < 0) return -WIN_BASE + diff * 100;
  return 0;
}

function alphabeta(
  board: Board,
  player: Player,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchContext,
): number {
  ctx.nodes += 1;
  if ((ctx.nodes & 511) === 0 && performance.now() > ctx.deadline) {
    ctx.aborted = true;
    return 0;
  }
  if (depth <= 0) return evaluate(board, player);

  const moves = getValidMoves(board, player);
  if (moves.length === 0) {
    if (!hasAnyMove(board, other(player))) return terminalScore(board, player);
    return -alphabeta(board, other(player), depth - 1, -beta, -alpha, ctx);
  }

  if (moves.length > 1) orderMoves(moves);
  let best = -INF;
  for (const move of moves) {
    const next = applyMove(board, move, player);
    const score = -alphabeta(next, other(player), depth - 1, -beta, -alpha, ctx);
    if (ctx.aborted) return 0;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Iterative-deepening alpha-beta search. Every root move is scored with a full
 * window so the returned rankings are comparable (that is what powers the
 * teaching list).
 */
export function analyse(
  board: Board,
  player: Player,
  options: { timeBudget?: number; maxDepth?: number } = {},
): AnalysisResult {
  const timeBudget = options.timeBudget ?? 170;
  const maxDepth = options.maxDepth ?? 7;
  const started = performance.now();
  const ctx: SearchContext = { nodes: 0, aborted: false, deadline: started + timeBudget };
  const moves = getValidMoves(board, player);
  if (moves.length === 0) {
    return { best: null, ranked: [], depth: 0, nodes: 0, time: 0, forced: false };
  }

  orderMoves(moves);
  let ranked: Array<{ index: number; score: number }> = moves.map((move) => ({ index: move.index, score: 0 }));
  let completedDepth = 0;
  let forced = false;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const scored: Array<{ index: number; score: number }> = [];
    let broken = false;
    for (const candidate of ranked) {
      const move = moves.find((candidateMove) => candidateMove.index === candidate.index)!;
      const next = applyMove(board, move, player);
      const score = -alphabeta(next, other(player), depth - 1, -INF, INF, ctx);
      if (ctx.aborted) {
        broken = true;
        break;
      }
      scored.push({ index: candidate.index, score });
    }
    if (broken) break;
    scored.sort((a, b) => b.score - a.score);
    ranked = scored;
    completedDepth = depth;
    if (Math.abs(ranked[0].score) > WIN_BASE - 500) {
      forced = true;
      break;
    }
    if (performance.now() > ctx.deadline) break;
  }

  return {
    best: ranked[0]?.index ?? moves[0].index,
    ranked,
    depth: completedDepth,
    nodes: ctx.nodes,
    time: performance.now() - started,
    forced,
  };
}

export function moveTags(board: Board, index: number, player: Player): string[] {
  const tags: string[] = [];
  if (CORNERS.includes(index) && board[index] === 0) tags.push("CORNER");
  else if (isEdge(index)) tags.push("EDGE");
  if (X_SQUARES.includes(index) && board[CORNER_OWNER[index]] === 0) tags.push("X-RISK");
  if (C_SQUARES.includes(index) && board[C_OWNER[index]] === 0) tags.push("C-RISK");
  void player;
  return tags;
}

/**
 * Human readable coaching notes for one candidate move.
 */
export function explainMove(board: Board, index: number, player: Player): Reason[] {
  const rival = other(player);
  const moves = getValidMoves(board, player);
  const move = moves.find((candidate) => candidate.index === index);
  const reasons: Reason[] = [];
  const add = (kind: ReasonKind, tone: Reason["tone"], text: string) => {
    reasons.push({ id: `${player}:${index}:${kind}`, kind, moveIndex: index, player, tone, text });
  };
  if (!move) {
    add("legal", "warn", "This square is not a legal move. Explore the highlighted alternatives instead.");
    return reasons;
  }

  const next = applyMove(board, move, player);
  const counts = countDiscs(board);
  const empties = counts.empty;

  const rivalMovesBefore = getValidMoves(board, rival);
  const rivalMovesAfter = getValidMoves(next, rival);
  const myMobilityBefore = moves.length;
  const myMobilityAfter = getValidMoves(next, player).length;
  const stableBefore = stableDiscs(board, player);
  const stableAfter = stableDiscs(next, player);
  const frontierBefore = frontierDiscs(board, player);
  const frontierAfter = frontierDiscs(next, player);

  const rivalCornersBefore = rivalMovesBefore.filter((candidate) => CORNERS.includes(candidate.index)).length;
  const rivalCornersAfter = rivalMovesAfter.filter((candidate) => CORNERS.includes(candidate.index)).length;

  if (CORNERS.includes(index)) {
    add("corner", "good", `Takes ${coordLabel(index)}, a corner. A corner disc can never be flipped again.`);
  } else if (isEdge(index)) {
    add("edge", "good", "Builds on an edge, where attacks can only run along the edge. An unanchored edge is not yet safe.");
  }

  if (X_SQUARES.includes(index) && board[CORNER_OWNER[index]] === 0) {
    add("corner-risk", "bad", `X-square: ${coordLabel(index)} sits diagonally beside the open ${coordLabel(CORNER_OWNER[index])} corner. It can give the rival access later.`);
  } else if (C_SQUARES.includes(index) && board[C_OWNER[index]] === 0) {
    add("corner-risk", "warn", `C-square: ${coordLabel(index)} is beside the open ${coordLabel(C_OWNER[index])} corner. The rival may use this disc as a lever.`);
  }

  if (rivalMovesAfter.length === 0 && myMobilityAfter > 0) {
    add("pass", "good", "Leaves the rival with no legal reply. They must pass, so you can move again.");
  } else if (rivalMovesBefore.length - rivalMovesAfter.length >= 3) {
    add("rival-mobility", "good", `Limits the rival: their available moves fall from ${rivalMovesBefore.length} to ${rivalMovesAfter.length}. Fewer options make them easier to control.`);
  } else if (rivalMovesAfter.length - rivalMovesBefore.length >= 3) {
    add("rival-mobility", "bad", `Opens the board up: rival replies jump from ${rivalMovesBefore.length} to ${rivalMovesAfter.length}, giving them more choices.`);
  }

  if (rivalCornersAfter > rivalCornersBefore) {
    add("corner-access", "bad", "Hands the rival a legal corner reply on their very next move.");
  } else if (rivalCornersBefore > 0 && rivalCornersAfter === 0) {
    add("corner-access", "good", "Blocks the rival's current corner access. They cannot take a corner on their next move.");
  }

  if (myMobilityAfter > myMobilityBefore) {
    add("your-mobility", "good", `Grows your potential options from ${myMobilityBefore} to ${myMobilityAfter}. The rival's reply may change which ones remain available.`);
  } else if (myMobilityBefore - myMobilityAfter >= 3) {
    add("your-mobility", "bad", `Reduces your flexibility: potential follow-ups drop from ${myMobilityBefore} to ${myMobilityAfter}, before the rival replies.`);
  }

  if (empties > 40) {
    if (move.flips.length <= 2) {
      add("flips", "good", `Quiet opening move: only ${move.flips.length} disc${move.flips.length === 1 ? "" : "s"} flip. Small captures often leave more flexibility early on.`);
    } else if (move.flips.length >= 5) {
      add("flips", "warn", `Flips ${move.flips.length} discs in the opening. Big early captures can expose more of your discs to counterplay.`);
    }
  } else if (empties < 18) {
    if (move.flips.length >= 4) {
      add("flips", "good", `Converts ${move.flips.length} discs in the endgame. Count the remaining replies: these discs are not automatically permanent.`);
    } else if (move.flips.length <= 1) {
      add("flips", "warn", "Flips only one disc. In the endgame, compare the final outcome of each line, not just this capture.");
    }
  } else {
    add("flips", "info", `Flips ${move.flips.length} rival disc${move.flips.length === 1 ? "" : "s"} right now by trapping them between two of yours.`);
  }

  if (stableAfter - stableBefore >= 2) {
    add("stability", "good", `Secures ${stableAfter - stableBefore} more stable edge discs. Corner-anchored runs and filled edges cannot be flipped.`);
  }

  if (frontierBefore - frontierAfter >= 3) {
    add("frontier", "good", `Tucks your group inward: ${frontierBefore - frontierAfter} fewer discs touch empty squares. These exposed discs are called frontier discs.`);
  } else if (frontierAfter - frontierBefore >= 3) {
    add("frontier", "warn", `Spreads you out: ${frontierAfter - frontierBefore} more discs touch empty squares and become exposed frontier discs.`);
  }

  if (reasons.length === 0) {
    add("flips", "info", `This move flips ${move.flips.length} rival discs. Follow the highlighted lines to see how they are bracketed.`);
  }

  return reasons.slice(0, 5);
}

export function ratingLabel(score: number, forced: boolean) {
  if (forced && Math.abs(score) > WIN_BASE - 500) {
    const discs = Math.round((Math.abs(score) - WIN_BASE) / 100);
    return `${score > 0 ? "+" : "−"}${discs}`;
  }
  const discs = score / 100;
  const clamped = Math.max(-64, Math.min(64, discs));
  return `${clamped > 0 ? "+" : clamped < 0 ? "−" : ""}${Math.abs(clamped).toFixed(1)}`;
}

export function evalPercentage(score: number) {
  if (Math.abs(score) > WIN_BASE - 500) return score > 0 ? 100 : 0;
  const swing = Math.tanh(score / 1400);
  return 50 + 50 * swing;
}

export { coordLabel };
