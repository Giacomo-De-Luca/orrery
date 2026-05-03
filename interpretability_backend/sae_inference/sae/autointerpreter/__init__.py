"""SAE autointerpreter pipeline.

See ``README.md`` for the end-to-end data flow.
"""

from scripts.sae.autointerpreter.collect_activations import ActivationCollector
from scripts.sae.autointerpreter.config import (
    AgentStageConfig,
    AutoInterpretCollectConfig,
    AutoInterpretConfig,
    AutoInterpretScoreConfig,
    StageFlags,
    TopKExtractConfig,
    load_experiments,
)
from scripts.sae.autointerpreter.extract_top_k import TopKFeatureExtractor
from scripts.sae.autointerpreter.prepare_agent_inputs import AgentInputWriter
from scripts.sae.autointerpreter.run_autointerpret import (
    AutoInterpretRunner,
    run_from_yaml,
)
from scripts.sae.autointerpreter.score_autointerpret import AutoInterpretScorer
from scripts.sae.autointerpreter.sparse_activation_store import SparseActivationStore

__all__ = [
    "ActivationCollector",
    "AgentInputWriter",
    "AgentStageConfig",
    "AutoInterpretCollectConfig",
    "AutoInterpretConfig",
    "AutoInterpretRunner",
    "AutoInterpretScoreConfig",
    "AutoInterpretScorer",
    "SparseActivationStore",
    "StageFlags",
    "TopKExtractConfig",
    "TopKFeatureExtractor",
    "load_experiments",
    "run_from_yaml",
]
