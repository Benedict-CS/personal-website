declare module "*wasm/perf-kernel/pkg" {
  const mod: {
    default?: () => Promise<void> | void;
    multiply_4x4?: (a: number[], b: number[]) => number[];
    compress_rgba_average?: (rgba: Uint8Array, width: number, height: number, factor: number) => Uint8Array;
    broadphase_collision?: (
      ax: number, ay: number, az: number, ar: number,
      bx: number, by: number, bz: number, br: number
    ) => boolean;
  };
  export = mod;
}

