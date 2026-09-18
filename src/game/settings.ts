export type BotLevelId = "novice" | "club" | "master" | "grandmaster";

export type GameMode = "bot" | "pvp";

export type BotLevelConfig = {
  id: BotLevelId;
  name: string;
  badge: string;
  depth: number;
  timeBudget: number;
  randomFactor: number;
  description: string;
};

export const BOT_LEVELS: Record<BotLevelId, BotLevelConfig> = {
  novice: {
    id: "novice",
    name: "Novice (1200)",
    badge: "LVL 1",
    depth: 2,
    timeBudget: 50,
    randomFactor: 0.35,
    description: "Evaluates only short lines and occasionally overlooks edge traps.",
  },
  club: {
    id: "club",
    name: "Club Player (1600)",
    badge: "LVL 2",
    depth: 4,
    timeBudget: 80,
    randomFactor: 0.12,
    description: "Solid corner hygiene and basic mobility awareness with minor inaccuracies.",
  },
  master: {
    id: "master",
    name: "Tactical Master (2000)",
    badge: "LVL 3",
    depth: 6,
    timeBudget: 150,
    randomFactor: 0.02,
    description: "Full positional search weighing stability, frontier discs, and wedges.",
  },
  grandmaster: {
    id: "grandmaster",
    name: "Grandmaster AI (2400+)",
    badge: "LVL MAX",
    depth: 8,
    timeBudget: 240,
    randomFactor: 0.0,
    description: "Deep alpha-beta iterative search playing ruthless, tournament-grade lines.",
  },
};

import {
  type Board,
  createInitialBoard,
} from "./reversi";

export type BoardPresetId = "standard" | "diagonal" | "corner_assault" | "wedge_puzzle" | "endgame_parity";

export type BoardPreset = {
  id: BoardPresetId;
  name: string;
  phaseTag: "OPENING" | "MIDGAME" | "ENDGAME";
  description: string;
  create: () => Board;
};

function parseBoardString(str: string): Board {
  const clean = str.replace(/\s+/g, "");
  const board = new Int8Array(64);
  for (let i = 0; i < 64; i += 1) {
    const char = clean[i];
    if (char === "1" || char === "P" || char === "X") board[i] = 1;
    else if (char === "2" || char === "O" || char === "B") board[i] = 2;
    else board[i] = 0;
  }
  return board;
}

export const BOARD_PRESETS: Record<BoardPresetId, BoardPreset> = {
  standard: {
    id: "standard",
    name: "Standard Tournament Opening",
    phaseTag: "OPENING",
    description: "The classic starting 4 discs. Test your central control and quiet moves.",
    create: () => createInitialBoard(),
  },
  diagonal: {
    id: "diagonal",
    name: "Diagonal Skirmish (Move 5)",
    phaseTag: "OPENING",
    description: "A common early state where diagonal lines contest the center.",
    create: () => {
      const b = new Int8Array(64);
      b[19] = 1;
      b[27] = 1;
      b[28] = 1;
      b[35] = 1;
      b[36] = 2;
      b[43] = 2;
      return b;
    },
  },
  corner_assault: {
    id: "corner_assault",
    name: "Corner Trap & X-Risk",
    phaseTag: "MIDGAME",
    description: "Open corners with discs lurking in C and X danger zones. Can you exploit them?",
    create: () =>
      parseBoardString(`
        . . . . . . . .
        . 2 2 1 1 2 . .
        . 2 1 1 2 2 2 .
        . 1 1 1 2 2 1 .
        . 1 2 2 1 1 1 .
        . 2 2 2 2 1 . .
        . . 1 1 2 . . .
        . . . . . . . .
      `),
  },
  wedge_puzzle: {
    id: "wedge_puzzle",
    name: "Edge Wedge & Mobility Lock",
    phaseTag: "MIDGAME",
    description: "Heavy side fighting where wedging between rival edge stones decides the initiative.",
    create: () =>
      parseBoardString(`
        . 1 1 1 1 1 . .
        . 1 2 2 2 1 2 .
        . 2 2 1 2 1 2 .
        . 2 1 2 1 1 2 .
        . 2 1 1 2 2 2 .
        . 2 2 2 1 1 1 .
        . . 1 2 2 1 . .
        . . . 1 1 . . .
      `),
  },
  endgame_parity: {
    id: "endgame_parity",
    name: "Endgame Parity Count (14 Empties)",
    phaseTag: "ENDGAME",
    description: "Only 14 squares remain! Precise region parity and sweep calculation will win.",
    create: () =>
      parseBoardString(`
        1 1 1 1 1 1 1 .
        1 1 1 2 2 2 1 .
        1 1 2 2 2 2 2 1
        1 2 2 1 2 2 2 1
        1 2 1 1 1 2 2 1
        2 2 1 1 1 1 2 2
        . 2 2 2 1 1 1 .
        . . 2 2 2 1 . .
      `),
  },
};

export type GameSettings = {
  mode: GameMode;
  botLevel: BotLevelId;
  starter: "p1" | "p2" | "random";
  preset: BoardPresetId;
};

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "bot",
  botLevel: "master",
  starter: "p1",
  preset: "standard",
};
