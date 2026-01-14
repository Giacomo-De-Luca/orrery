// Copyright (c) 2025 Apple Inc. Licensed under MIT License.

use crate::array_2d::Array2D;

pub fn find_local_maxima(array: &Array2D<f32>) -> Vec<(i32, i32)> {
    let mut result: Vec<(i32, i32)> = Vec::new();

    if array.width() < 3 || array.height() < 3 {
        return result;
    }
    for y in 1..array.height() - 1 {
        let mut p01: f32;
        let mut p02 = array[(1, y - 1)];
        let mut p10: f32;
        let mut p11 = array[(0, y)];
        let mut p12 = array[(1, y)];
        let mut p21: f32;
        let mut p22 = array[(1, y + 1)];
        for x in 1..array.width() - 1 {
            p01 = p02;
            p02 = array[(x + 1, y - 1)];
            p10 = p11;
            p11 = p12;
            p12 = array[(x + 1, y)];
            p21 = p22;
            p22 = array[(x + 1, y + 1)];

            if p11 > p01 && p11 > p21 && p11 > p10 && p11 > p12 {
                result.push((x, y));
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_local_maxima() {
        let mut array = Array2D::<f32>::zeros(10, 10);
        array[(3, 3)] = 1.0;
        array[(5, 5)] = 1.0;
        array[(0, 2)] = 1.0; // edge doesn't count.
        let result = find_local_maxima(&array);
        assert!(result == vec![(3, 3), (5, 5)]);
    }
}
