// Copyright (c) 2025 Apple Inc. Licensed under MIT License.

#![allow(dead_code)]

mod array_2d;
mod disjoint_set;
mod disjoint_set_2d;
mod find_clusters;
mod find_local_maxima;
mod plane_fitting;
mod polygon;
mod simplify_contours;
mod trace_contours;

pub use array_2d::Array2D;
pub use find_clusters::{find_clusters, ClusterSummary, FindClustersOptions};
pub use polygon::smooth_polygon;
pub use simplify_contours::fit_rects_from_polygons;
pub use trace_contours::trace_all_outer_contours;
