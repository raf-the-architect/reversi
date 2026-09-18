import { useCallback, useEffect, useMemo, useState } from "react";
import { createReasonPreview } from "../game/coachPreview";
import type { Reason } from "../game/engine";
import type { Board } from "../game/reversi";

export type ReasonInteraction = "hover" | "leave" | "focus" | "blur" | "pin";
export type ReasonControls = {
  activeId: string | null;
  pinnedId: string | null;
  enabled: boolean;
  onInteract: (reason: Reason, interaction: ReasonInteraction) => void;
};

type Selection = { board: Board; reason: Reason };
type PreviewState = { hovered: Selection | null; focused: Selection | null; pinned: Selection | null };
const EMPTY: PreviewState = { hovered: null, focused: null, pinned: null };

export function useReasonPreview(board: Board, enabled: boolean, selected: number) {
  const [state, setState] = useState<PreviewState>(EMPTY);
  const valid = (entry: Selection | null) => enabled && entry?.board === board ? entry : null;
  const pinned = valid(state.pinned);
  const active = valid(state.hovered) ?? valid(state.focused) ?? pinned;

  const clear = useCallback(() => setState(EMPTY), []);
  useEffect(clear, [board, enabled, selected, clear]);

  const onInteract = useCallback((reason: Reason, interaction: ReasonInteraction) => {
    if (!enabled) return;
    const selection = { board, reason };
    setState((previous) => {
      if (interaction === "pin") {
        return previous.pinned?.board === board && previous.pinned.reason.id === reason.id
          ? EMPTY
          : { hovered: null, focused: null, pinned: selection };
      }
      if (interaction === "hover") return { ...previous, hovered: selection };
      if (interaction === "focus") return { ...previous, focused: selection };
      const key = interaction === "leave" ? "hovered" : "focused";
      return previous[key]?.reason.id === reason.id ? { ...previous, [key]: null } : previous;
    });
  }, [board, enabled]);

  const preview = useMemo(() => active ? createReasonPreview(board, active.reason) : null, [active, board]);
  const controls = useMemo<ReasonControls>(() => ({
    activeId: active?.reason.id ?? null,
    pinnedId: pinned?.reason.id ?? null,
    enabled,
    onInteract,
  }), [active, pinned, enabled, onInteract]);

  return { preview, controls, clear };
}