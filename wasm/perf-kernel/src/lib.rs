use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn multiply_4x4(a: Vec<f64>, b: Vec<f64>) -> Vec<f64> {
    if a.len() != 16 || b.len() != 16 {
        return vec![];
    }
    let mut out = vec![0.0; 16];
    for row in 0..4 {
        for col in 0..4 {
            let mut sum = 0.0;
            for k in 0..4 {
                sum += a[row * 4 + k] * b[k * 4 + col];
            }
            out[row * 4 + col] = sum;
        }
    }
    out
}

#[wasm_bindgen]
pub fn compress_rgba_average(rgba: Vec<u8>, width: usize, height: usize, factor: usize) -> Vec<u8> {
    if factor == 0 || width == 0 || height == 0 {
        return vec![];
    }
    let out_w = width / factor;
    let out_h = height / factor;
    if out_w == 0 || out_h == 0 {
        return vec![];
    }
    let mut out = vec![0u8; out_w * out_h * 4];

    for oy in 0..out_h {
        for ox in 0..out_w {
            let mut r = 0u32;
            let mut g = 0u32;
            let mut b = 0u32;
            let mut a = 0u32;
            let mut count = 0u32;
            for fy in 0..factor {
                for fx in 0..factor {
                    let x = ox * factor + fx;
                    let y = oy * factor + fy;
                    let idx = (y * width + x) * 4;
                    if idx + 3 < rgba.len() {
                        r += rgba[idx] as u32;
                        g += rgba[idx + 1] as u32;
                        b += rgba[idx + 2] as u32;
                        a += rgba[idx + 3] as u32;
                        count += 1;
                    }
                }
            }
            let out_idx = (oy * out_w + ox) * 4;
            if count > 0 {
                out[out_idx] = (r / count) as u8;
                out[out_idx + 1] = (g / count) as u8;
                out[out_idx + 2] = (b / count) as u8;
                out[out_idx + 3] = (a / count) as u8;
            }
        }
    }
    out
}

#[wasm_bindgen]
pub fn broadphase_collision(
    ax: f64,
    ay: f64,
    az: f64,
    ar: f64,
    bx: f64,
    by: f64,
    bz: f64,
    br: f64,
) -> bool {
    let dx = ax - bx;
    let dy = ay - by;
    let dz = az - bz;
    let dist2 = dx * dx + dy * dy + dz * dz;
    let radius = ar + br;
    dist2 <= radius * radius
}

