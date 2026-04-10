type WasmPerfKernel = {
  multiply_4x4: (a: number[], b: number[]) => number[];
  compress_rgba_average: (rgba: Uint8Array, width: number, height: number, factor: number) => Uint8Array;
  broadphase_collision: (
    ax: number, ay: number, az: number, ar: number,
    bx: number, by: number, bz: number, br: number
  ) => boolean;
  aggregate_daily_counts?: (timestampsMs: number[], startDayMs: number, endDayMs: number) => number[];
};

let wasmModulePromise: Promise<WasmPerfKernel | null> | null = null;

async function loadWasm(): Promise<WasmPerfKernel | null> {
  if (!wasmModulePromise) {
    wasmModulePromise = (async () => {
      try {
        // Optional wasm-pack output: not bundled — avoids "Module not found" at build when pkg is absent.
        const mod = (await import(
          /* webpackIgnore: true */
          "../../../wasm/perf-kernel/pkg"
        )) as WasmPerfKernel & { default?: unknown };
        const init = mod.default;
        if (typeof init === "function") {
          await (init as () => Promise<void> | void)();
        }
        return mod;
      } catch {
        return null;
      }
    })();
  }
  return wasmModulePromise;
}

function multiplyFallback(a: number[], b: number[]): number[] {
  if (a.length !== 16 || b.length !== 16) return [];
  const out = Array<number>(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[row * 4 + k] * b[k * 4 + col];
      out[row * 4 + col] = sum;
    }
  }
  return out;
}

export async function multiply4x4(a: number[], b: number[]): Promise<number[]> {
  const wasm = await loadWasm();
  if (wasm?.multiply_4x4) return wasm.multiply_4x4(a, b);
  return multiplyFallback(a, b);
}

export async function broadphaseCollision(
  a: { x: number; y: number; z: number; r: number },
  b: { x: number; y: number; z: number; r: number }
): Promise<boolean> {
  const wasm = await loadWasm();
  if (wasm?.broadphase_collision) {
    return wasm.broadphase_collision(a.x, a.y, a.z, a.r, b.x, b.y, b.z, b.r);
  }
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz <= (a.r + b.r) * (a.r + b.r);
}

function aggregateDailyCountsFallback(
  timestampsMs: number[],
  startDayMs: number,
  endDayMs: number
): number[] {
  const dayMs = 24 * 60 * 60 * 1000;
  if (endDayMs < startDayMs) return [];
  const days = Math.floor((endDayMs - startDayMs) / dayMs) + 1;
  const out = Array<number>(days).fill(0);
  for (const ts of timestampsMs) {
    const idx = Math.floor((ts - startDayMs) / dayMs);
    if (idx >= 0 && idx < out.length) out[idx] += 1;
  }
  return out;
}

/**
 * Aggregates per-day counts from unix timestamps.
 * Uses WASM when available and falls back to JS.
 */
export async function aggregateDailyCounts(
  timestampsMs: number[],
  startDayMs: number,
  endDayMs: number
): Promise<number[]> {
  const wasm = await loadWasm();
  if (wasm?.aggregate_daily_counts) {
    try {
      return wasm.aggregate_daily_counts(timestampsMs, startDayMs, endDayMs);
    } catch {
      // Fall back when function signature mismatches the loaded WASM.
    }
  }
  return aggregateDailyCountsFallback(timestampsMs, startDayMs, endDayMs);
}

