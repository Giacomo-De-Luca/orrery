"""Topic-quality evaluation package.

Standalone metrics + a config-driven runner for scoring extracted topics.
See ``README.md`` for usage and the meaning of each metric.
"""

from .quality_metrics import TopicQualityEvaluator

__all__ = ["TopicQualityEvaluator"]
