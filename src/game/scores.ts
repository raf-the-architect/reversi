export type Outcome = "WIN" | "LOSS" | "DRAW";

export type HighScore = {
  score: number;
  result: Outcome;
  date: string;
};

const KEY = "neon-reversi-scores";

export function loadScores(): HighScore[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]") as HighScore[];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function saveScores(scores: HighScore[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    /* storage unavailable — scores simply stay in memory */
  }
}

export const formatScore = (score: number) => String(Math.max(0, score)).padStart(4, "0");
