import {
  createTextHistory,
  pushTextHistory,
  redoTextHistory,
  undoTextHistory,
} from "@/lib/text-history";

describe("text history", () => {
  it("pushes snapshots and supports undo/redo", () => {
    let state = createTextHistory("a");
    state = pushTextHistory(state, "ab");
    state = pushTextHistory(state, "abc");

    const undo1 = undoTextHistory(state);
    expect(undo1.changed).toBe(true);
    expect(undo1.state.present).toBe("ab");

    const undo2 = undoTextHistory(undo1.state);
    expect(undo2.state.present).toBe("a");

    const redo = redoTextHistory(undo2.state);
    expect(redo.changed).toBe(true);
    expect(redo.state.present).toBe("ab");
  });

  it("trims old history entries when max size reached", () => {
    let state = createTextHistory("0");
    state = pushTextHistory(state, "1", 2);
    state = pushTextHistory(state, "2", 2);
    state = pushTextHistory(state, "3", 2);
    expect(state.past).toEqual(["1", "2"]);
  });
});
