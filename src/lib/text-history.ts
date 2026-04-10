export type TextHistoryState = {
  past: string[];
  present: string;
  future: string[];
};

export function createTextHistory(initial: string): TextHistoryState {
  return { past: [], present: initial, future: [] };
}

export function pushTextHistory(state: TextHistoryState, next: string, maxEntries = 120): TextHistoryState {
  if (next === state.present) return state;
  const nextPast = [...state.past, state.present];
  const trimmedPast = nextPast.length > maxEntries ? nextPast.slice(nextPast.length - maxEntries) : nextPast;
  return {
    past: trimmedPast,
    present: next,
    future: [],
  };
}

export function undoTextHistory(state: TextHistoryState): { state: TextHistoryState; changed: boolean } {
  if (state.past.length === 0) return { state, changed: false };
  const previous = state.past[state.past.length - 1] ?? state.present;
  return {
    changed: true,
    state: {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    },
  };
}

export function redoTextHistory(state: TextHistoryState): { state: TextHistoryState; changed: boolean } {
  if (state.future.length === 0) return { state, changed: false };
  const next = state.future[0] ?? state.present;
  return {
    changed: true,
    state: {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    },
  };
}
