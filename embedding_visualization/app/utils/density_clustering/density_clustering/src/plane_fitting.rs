// Copyright (c) 2025 Apple Inc. Licensed under MIT License.

fn solve_2_equations(s1: f64, s2: f64, s3: f64, n1: f64, n2: f64, n3: f64) -> (f64, f64) {
    let a = (n3 * s2 - n2 * s3) / (n2 * s1 - n1 * s2);
    let b = (n1 * s3 - n3 * s1) / (n2 * s1 - n1 * s2);
    (a, b)
}

pub fn estimate_density_cutoff_plane(boundary: &Vec<(i32, i32, f32)>) -> (f64, f64, f64) {
    if boundary.is_empty() {
        return (0.0, 0.0, 0.0);
    }
    let mut sum_x: f64 = 0.0;
    let mut sum_y: f64 = 0.0;
    let mut sum_h: f64 = 0.0;
    let mut sum_xx: f64 = 0.0;
    let mut sum_yy: f64 = 0.0;
    let mut sum_xy: f64 = 0.0;
    let mut sum_hx: f64 = 0.0;
    let mut sum_hy: f64 = 0.0;
    for &(x, y, h) in boundary {
        let xf = x as f64;
        let yf = y as f64;
        let hf = h as f64;
        sum_x += xf;
        sum_y += yf;
        sum_h += hf;
        sum_xx += xf * xf;
        sum_yy += yf * yf;
        sum_xy += xf * yf;
        sum_hx += hf * xf;
        sum_hy += hf * yf;
    }
    sum_x /= boundary.len() as f64;
    sum_y /= boundary.len() as f64;
    sum_h /= boundary.len() as f64;
    sum_xx /= boundary.len() as f64;
    sum_yy /= boundary.len() as f64;
    sum_xy /= boundary.len() as f64;
    sum_hx /= boundary.len() as f64;
    sum_hy /= boundary.len() as f64;

    let sa1 = sum_xx - sum_x * sum_x;
    let sb1 = sum_xy - sum_x * sum_y;
    let sc1 = sum_x * sum_h - sum_hx;
    let sa2 = sum_xy - sum_x * sum_y;
    let sb2 = sum_yy - sum_y * sum_y;
    let sc2 = sum_y * sum_h - sum_hy;

    let (mut a, mut b) = solve_2_equations(sa1, sb1, sc1, sa2, sb2, sc2);
    if !a.is_finite() || !b.is_finite() {
        a = 0.0;
        b = 0.0;
    }
    let mut c: f64 = -f64::INFINITY;
    for &(x, y, h) in boundary {
        let xf = x as f64;
        let yf = y as f64;
        let hf = h as f64;
        // c <= hf - a * xf - b * yf;
        c = f64::max(c, hf - a * xf - b * yf);
    }
    (a, b, c)
}
