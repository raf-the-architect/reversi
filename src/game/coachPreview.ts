import { CORNERS, type Reason } from "./engine";
import { getFrontierSquares, getStableEdgeSquares } from "./position";
import {
  applyMove,
  colOf,
  coordLabel,
  getValidMoves,
  NEIGHBORS,
  other,
  RAYS,
  rowOf,
  type Board,
  type Move,
  type Player,
} from "./reversi";

export type PreviewRole =
  | "move" | "flip" | "anchor" | "your-option" | "rival-option"
  | "blocked" | "danger" | "frontier" | "space" | "safe" | "interior" | "edge";

export const PREVIEW_COLORS: Record<PreviewRole, string> = {
  move: "#7ef9ff",
  flip: "#7ef9ff",
  anchor: "#e8f5db",
  "your-option": "#ff9e8c",
  "rival-option": "#b9f4cf",
  blocked: "#ff8b83",
  danger: "#ff8b83",
  frontier: "#ffd08a",
  space: "#b7c7c3",
  safe: "#b9f4cf",
  interior: "#7ef9ff",
  edge: "#7ef9ff",
};

export const PREVIEW_LABELS: Record<PreviewRole, string> = {
  move: "hypothetical move, not played",
  flip: "would flip to your color",
  anchor: "existing disc that brackets the capture",
  "your-option": "possible follow-up, not a move played",
  "rival-option": "possible bot reply, not a move played",
  blocked: "previous option no longer available",
  danger: "corner access or capture risk",
  frontier: "exposed disc beside an empty square",
  space: "adjacent empty square",
  safe: "guaranteed stable edge disc",
  interior: "disc no longer touching an empty square",
  edge: "edge square",
};

export type PreviewMark = { index: number; role: PreviewRole };
export type PreviewGhost = { index: number; player: Player; kind: "move" | "flip" | "option" };
export type PreviewLine = { from: number; to: number; role: PreviewRole; arrow: boolean };
export type PreviewLegend = { role: PreviewRole; label: string };

export type ReasonPreview = {
  reasonId: string;
  moveIndex: number;
  title: string;
  caption: string;
  marks: PreviewMark[];
  ghosts: PreviewGhost[];
  lines: PreviewLine[];
  legend: PreviewLegend[];
};

const CORNER_NEIGHBOR: Record<number, number> = {
  1: 0, 8: 0, 9: 0, 6: 7, 14: 7, 15: 7,
  48: 56, 49: 56, 57: 56, 54: 63, 55: 63, 62: 63,
};

// Previews are annotations over a copied position, never instructions to
// mutate the live board. Every option ghost comes from the legal-move list.
export function createReasonPreview(board: Board, reason: Reason): ReasonPreview {
  const { moveIndex: index, player } = reason;
  const rival = other(player);
  const moves = getValidMoves(board, player);
  const move = moves.find((candidate) => candidate.index === index);
  const after = move ? applyMove(board, move, player) : board;
  const preview: ReasonPreview = {
    reasonId: reason.id,
    moveIndex: index,
    title: `Try ${coordLabel(index)}`,
    caption: "Translucent discs show a possible move. Your game has not changed.",
    marks: [],
    ghosts: [],
    lines: [],
    legend: [],
  };

  const mark = (squares: number[], role: PreviewRole) => {
    for (const square of squares) {
      if (square >= 0 && square < 64 && !preview.marks.some((item) => item.index === square && item.role === role)) {
        preview.marks.push({ index: square, role });
      }
    }
  };
  const legend = (role: PreviewRole, label: string) => {
    if (!preview.legend.some((item) => item.role === role)) preview.legend.push({ role, label });
  };
  const options = (candidates: Move[], owner: Player) => {
    const role = owner === player ? "your-option" : "rival-option";
    mark(candidates.map((candidate) => candidate.index), role);
    for (const candidate of candidates) {
      if (after[candidate.index] === 0) {
        preview.ghosts.push({ index: candidate.index, player: owner, kind: "option" });
      }
    }
  };
  const captureLines = (position: Board, candidate: Move, owner: Player, role: PreviewRole) => {
    for (let direction = 0; direction < 8; direction += 1) {
      const ray = RAYS[candidate.index * 8 + direction];
      let captured = 0;
      for (const square of ray) {
        if (position[square] === other(owner)) {
          captured += 1;
        } else {
          if (captured > 0 && position[square] === owner) {
            preview.lines.push({ from: candidate.index, to: square, role, arrow: true });
            mark([square], "anchor");
          }
          break;
        }
      }
    }
  };

  if (!move) {
    preview.title = "Find a legal move";
    preview.caption = moves.length > 0
      ? `${coordLabel(index)} cannot be played now. A legal move must trap at least one rival disc; coral ghosts mark your alternatives.`
      : "You have no legal move in this position. A player with no move must pass; if neither side can move, the game ends.";
    mark([index], "danger");
    options(moves, player);
    legend("danger", "Not legal");
    legend("your-option", `${moves.length} legal alternatives`);
    return preview;
  }

  mark([index], "move");
  preview.ghosts.push({ index, player, kind: "move" });
  move.flips.forEach((square) => preview.ghosts.push({ index: square, player, kind: "flip" }));
  legend("move", `1: Try ${coordLabel(index)}`);

  const rivalBefore = getValidMoves(board, rival);
  const rivalAfter = getValidMoves(after, rival);
  const myAfter = getValidMoves(after, player);

  switch (reason.kind) {
    case "corner":
    case "stability": {
      const beforeStable = getStableEdgeSquares(board, player);
      const stable = getStableEdgeSquares(after, player);
      const gained = stable.filter((square) => !beforeStable.includes(square));
      mark(stable, "safe");
      preview.title = reason.kind === "corner" ? "A corner is yours for good" : "Discs that cannot flip back";
      preview.caption = `After ${coordLabel(index)}, ${stable.length} edge discs are guaranteed safe (${gained.length} newly secured). Outlined discs belong to a corner-anchored run or a completely filled edge.`;
      legend("safe", `${stable.length} safe edge discs`);
      break;
    }
    case "edge": {
      const edge: number[] = [];
      for (let square = 0; square < 64; square += 1) {
        if ((rowOf(index) === 0 || rowOf(index) === 7) && rowOf(square) === rowOf(index)) edge.push(square);
        else if ((colOf(index) === 0 || colOf(index) === 7) && colOf(square) === colOf(index)) edge.push(square);
      }
      const stable = getStableEdgeSquares(after, player).filter((square) => edge.includes(square));
      mark(edge, "edge");
      mark(stable, "safe");
      preview.title = "See the edge, not just the capture";
      preview.caption = `Try ${coordLabel(index)} on this highlighted edge. Discs here can only be flipped along the edge. Only the green outlined discs are already guaranteed safe.`;
      legend("edge", "Contested edge");
      if (stable.length > 0) legend("safe", "Already safe");
      break;
    }
    case "corner-risk": {
      const corner = CORNER_NEIGHBOR[index];
      if (corner === undefined) break;
      const reply = rivalAfter.find((candidate) => candidate.index === corner);
      mark([index, corner], "danger");
      preview.lines.push({ from: index, to: corner, role: "danger", arrow: true });
      preview.title = `Watch the ${coordLabel(corner)} corner`;
      preview.caption = reply
        ? `After ${coordLabel(index)}, the bot can immediately play ${coordLabel(corner)}. The mint ghost is a legal corner reply; the dashed arrow links it to your risky square.`
        : `${coordLabel(index)} borders the empty ${coordLabel(corner)} corner. This is a future risk, not an immediate legal bot move, so the corner is outlined without a ghost disc.`;
      if (reply) {
        options([reply], rival);
        legend("rival-option", "Legal bot corner reply");
      }
      legend("danger", "Open corner risk");
      break;
    }
    case "corner-access": {
      const before = rivalBefore.filter((candidate) => CORNERS.includes(candidate.index));
      const remaining = rivalAfter.filter((candidate) => CORNERS.includes(candidate.index));
      const newlyOpen = remaining.filter((candidate) => !before.some((old) => old.index === candidate.index));
      const closed = before.filter((candidate) => !remaining.some((next) => next.index === candidate.index));
      const replies = newlyOpen.length > 0 ? newlyOpen : remaining;
      mark(closed.map((candidate) => candidate.index), "blocked");
      if (replies.length > 0) {
        options(replies, rival);
        replies.forEach((reply) => {
          mark(reply.flips, "danger");
          captureLines(after, reply, rival, "danger");
        });
        preview.title = "The bot gets a corner reply";
        preview.caption = `After ${coordLabel(index)}, mint ghosts show legal corner replies. Red rings mark discs those replies would flip. These are alternatives, not simultaneous moves.`;
        legend("rival-option", "Bot corner replies");
        legend("danger", "Discs at risk");
      } else {
        preview.title = "Corner access blocked";
        preview.caption = `After ${coordLabel(index)}, crossed corners are no longer legal bot replies. This blocks access for now; it does not mean you own those corners.`;
      }
      if (closed.length > 0) legend("blocked", "Corner reply removed");
      break;
    }
    case "rival-mobility":
    case "your-mobility":
    case "pass": {
      const showMine = reason.kind !== "rival-mobility";
      const before = reason.kind === "pass" ? rivalBefore : showMine ? moves : rivalBefore;
      const afterOptions = showMine ? myAfter : rivalAfter;
      const removed = before.filter((candidate) => reason.kind === "pass"
        || !afterOptions.some((next) => next.index === candidate.index));
      mark(removed.map((candidate) => candidate.index), "blocked");
      options(afterOptions, showMine ? player : rival);
      preview.title = reason.kind === "pass"
        ? "The bot passes. You move again."
        : `${showMine ? "Your options" : "Bot replies"}: ${before.length} to ${afterOptions.length}`;
      preview.caption = reason.kind === "pass"
        ? `After ${coordLabel(index)}, the bot has zero legal moves. Coral ghosts show your ${myAfter.length} choices for the extra turn. Pick just one; nothing has been played.`
        : rivalAfter.length === 0 && myAfter.length === 0
          ? `After ${coordLabel(index)}, neither side has a legal move, so the game would end. Crosses mark the options that disappear. This is only a preview.`
          : showMine
            ? `After ${coordLabel(index)}, coral ghosts show possible follow-ups. The bot replies first and may change them. Crosses show options this move removes.`
            : `After ${coordLabel(index)}, mint ghosts show every legal bot reply. The bot chooses one, not all of them. Crosses show its previous options that disappear.`;
      legend(showMine ? "your-option" : "rival-option", `${afterOptions.length} ${showMine ? "potential moves" : "bot replies"}`);
      if (removed.length > 0) legend("blocked", `${removed.length} options removed`);
      break;
    }
    case "frontier": {
      const before = getFrontierSquares(board, player);
      const exposed = getFrontierSquares(after, player);
      const interior = before.filter((square) => !exposed.includes(square) && after[square] === player);
      const empties = [...new Set(exposed.flatMap((square) => NEIGHBORS[square].filter((neighbor) => after[neighbor] === 0)))];
      mark(exposed, "frontier");
      mark(interior, "interior");
      mark(empties, "space");
      const example = exposed.find((square) => !before.includes(square)) ?? exposed[0];
      if (example !== undefined) {
        NEIGHBORS[example].filter((square) => after[square] === 0).forEach((square) => {
          preview.lines.push({ from: example, to: square, role: "frontier", arrow: false });
        });
      }
      preview.title = `Exposed discs: ${before.length} to ${exposed.length}`;
      preview.caption = exposed.length > 0
        ? `After ${coordLabel(index)}, amber rings mark your discs touching empty squares. Dotted links show one example. Interior discs have fewer exposed sides, but are not automatically stable.`
        : `After ${coordLabel(index)}, none of your discs touch empty squares. Cyan outlines show discs no longer exposed. Interior discs are not automatically stable.`;
      legend("frontier", `${exposed.length} exposed discs`);
      legend("space", "Adjacent empties");
      if (interior.length > 0) legend("interior", "No longer exposed");
      break;
    }
    default: {
      mark(move.flips, "flip");
      captureLines(board, move, player, "flip");
      preview.title = `${move.flips.length} disc${move.flips.length === 1 ? "" : "s"} would flip`;
      preview.caption = `Try ${coordLabel(index)}. Cyan lines connect the new disc to an existing one of yours. Rival discs trapped in between change color; translucent coral discs show the result.`;
      legend("flip", `${move.flips.length} captured disc${move.flips.length === 1 ? "" : "s"}`);
      legend("anchor", "Your existing anchor");
    }
  }

  return preview;
}