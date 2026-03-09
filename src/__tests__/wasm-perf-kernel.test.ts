import { broadphaseCollision, multiply4x4 } from "@/lib/wasm/perf-kernel";

describe("wasm perf kernel bridge", () => {
  it("multiplies two 4x4 matrices using wasm or fallback", async () => {
    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1];
    const b = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1];
    const out = await multiply4x4(a, b);
    expect(out).toHaveLength(16);
  });

  it("detects broadphase sphere collision", async () => {
    const hit = await broadphaseCollision(
      { x: 0, y: 0, z: 0, r: 1 },
      { x: 1, y: 0, z: 0, r: 1 }
    );
    const miss = await broadphaseCollision(
      { x: 0, y: 0, z: 0, r: 1 },
      { x: 5, y: 0, z: 0, r: 1 }
    );
    expect(hit).toBe(true);
    expect(miss).toBe(false);
  });
});

