import { NEIGHBORS, type Board, type Player } from "./reversi";

const EDGES = [
  Array.from({ length: 8 }, (_, i) => i),
  Array.from({ length: 8 }, (_, i) => 56 + i),
  Array.from({ length: 8 }, (_, i) => i * 8),
  Array.from({ length: 8 }, (_, i) => i * 8 + 7),
];

export function getFrontierSquares(board: Board, player: Player): number[] {
  const squares: number[] = [];
  for (let index = 0; index < 64; index += 1) {
    if (board[index] === player && NEIGHBORS[index].some((neighbor) => board[neighbor] === 0)) {
      squares.push(index);
    }
  }
  return squares;
}

// These edge discs are provably stable, unlike an unanchored edge or an
// interior disc whose stability would need a more involved proof.
export function getStableEdgeSquares(board: Board, player: Player): number[] {
  const stable = new Set<number>();
  for (const edge of EDGES) {
    if (edge.every((index) => board[index] !== 0)) {
      edge.forEach((index) => {
        if (board[index] === player) stable.add(index);
      });
      continue;
    }
    for (const direction of [edge, [...edge].reverse()]) {
      for (const index of direction) {
        if (board[index] !== player) break;
        stable.add(index);
      }
    }
  }
  return [...stable].sort((a, b) => a - b);
}