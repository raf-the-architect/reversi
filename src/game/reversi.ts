export type Cell = 0 | 1 | 2;
export type Player = 1 | 2;
export type Board = Int8Array;

export type Move = {
  index: number;
  flips: number[];
};

const DIRS: Array<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export const rowOf = (index: number) => (index / 8) | 0;
export const colOf = (index: number) => index % 8;
export const other = (player: Player): Player => (player === 1 ? 2 : 1);

const RAYS: number[][] = [];
const NEIGHBORS: number[][] = [];

(function buildTables() {
  for (let index = 0; index < 64; index += 1) {
    const row = rowOf(index);
    const col = colOf(index);
    for (let dir = 0; dir < 8; dir += 1) {
      const ray: number[] = [];
      let r = row + DIRS[dir][0];
      let c = col + DIRS[dir][1];
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        ray.push(r * 8 + c);
        r += DIRS[dir][0];
        c += DIRS[dir][1];
      }
      RAYS.push(ray);
    }
  }
  for (let index = 0; index < 64; index += 1) {
    const row = rowOf(index);
    const col = colOf(index);
    const list: number[] = [];
    for (const [dr, dc] of DIRS) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) list.push(r * 8 + c);
    }
    NEIGHBORS.push(list);
  }
})();

export function createInitialBoard(): Board {
  const board = new Int8Array(64);
  board[27] = 2;
  board[28] = 1;
  board[35] = 1;
  board[36] = 2;
  return board;
}

export function collectFlips(board: Board, index: number, player: Player, out: number[]): boolean {
  if (board[index] !== 0) return false;
  const opponent = other(player);
  let found = false;
  for (let dir = 0; dir < 8; dir += 1) {
    const ray = RAYS[index * 8 + dir];
    const line: number[] = [];
    for (let step = 0; step < ray.length; step += 1) {
      const cell = board[ray[step]];
      if (cell === opponent) {
        line.push(ray[step]);
        continue;
      }
      if (line.length > 0 && cell === player) {
        for (const cellIndex of line) out.push(cellIndex);
        found = true;
      }
      break;
    }
  }
  return found;
}

export function getFlips(board: Board, index: number, player: Player): number[] {
  const flips: number[] = [];
  return collectFlips(board, index, player, flips) ? flips : flips;
}

export function isValidMove(board: Board, index: number, player: Player): boolean {
  if (board[index] !== 0) return false;
  let touchesOpponent = false;
  for (const neighbor of NEIGHBORS[index]) {
    if (board[neighbor] === other(player)) {
      touchesOpponent = true;
      break;
    }
  }
  if (!touchesOpponent) return false;
  const flips: number[] = [];
  return collectFlips(board, index, player, flips);
}

export function getValidMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];
  const opponent = other(player);
  for (let index = 0; index < 64; index += 1) {
    if (board[index] !== 0) continue;
    let touchesOpponent = false;
    for (const neighbor of NEIGHBORS[index]) {
      if (board[neighbor] === opponent) {
        touchesOpponent = true;
        break;
      }
    }
    if (!touchesOpponent) continue;
    const flips: number[] = [];
    if (collectFlips(board, index, player, flips)) moves.push({ index, flips });
  }
  return moves;
}

export function hasAnyMove(board: Board, player: Player): boolean {
  const opponent = other(player);
  for (let index = 0; index < 64; index += 1) {
    if (board[index] !== 0) continue;
    let touchesOpponent = false;
    for (const neighbor of NEIGHBORS[index]) {
      if (board[neighbor] === opponent) {
        touchesOpponent = true;
        break;
      }
    }
    if (!touchesOpponent) continue;
    const flips: number[] = [];
    if (collectFlips(board, index, player, flips)) return true;
  }
  return false;
}

export function applyMove(board: Board, move: Move, player: Player): Board {
  const next = new Int8Array(board);
  next[move.index] = player;
  for (const flip of move.flips) next[flip] = player;
  return next;
}

export function applyMoveIndex(board: Board, index: number, player: Player): { board: Board; flips: number[] } | null {
  const flips: number[] = [];
  if (!collectFlips(board, index, player, flips)) return null;
  return { board: applyMove(board, { index, flips }, player), flips };
}

export function countDiscs(board: Board) {
  let player = 0;
  let ai = 0;
  let empty = 0;
  for (let index = 0; index < 64; index += 1) {
    const cell = board[index];
    if (cell === 1) player += 1;
    else if (cell === 2) ai += 1;
    else empty += 1;
  }
  return { player, ai, empty };
}

export function discDiff(board: Board, player: Player) {
  const counts = countDiscs(board);
  const mine = player === 1 ? counts.player : counts.ai;
  const theirs = player === 1 ? counts.ai : counts.player;
  return mine - theirs;
}

const FILES = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const coordLabel = (index: number) => `${FILES[colOf(index)]}${rowOf(index) + 1}`;
export { FILES, NEIGHBORS, RAYS };
