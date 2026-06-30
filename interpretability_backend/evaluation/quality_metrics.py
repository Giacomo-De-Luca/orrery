"""Topic-quality evaluation metrics.

A single :class:`TopicQualityEvaluator` computes a bundle of cluster- and
topic-quality scores from clustering outputs that are already available in the
topic-extraction pipeline:

* **DBCV** — density-based cluster validity, read from a fitted HDBSCAN model's
  ``relative_validity_`` (the metric that actually fits HDBSCAN's arbitrary-shaped,
  variable-density clusters; silhouette does not).
* **Silhouette (embedding space)** — cosine silhouette on the original vectors;
  answers "are the visual clusters real, or projection artifacts?".
* **Silhouette (projection space)** — euclidean silhouette on the 2D/3D coords the
  clustering was run on.
* **Topic diversity** — fraction of unique words across topics' top-N keywords.
* **C_v / U_Mass coherence** — keyword interpretability via gensim's reference
  ``CoherenceModel`` (no embedding model needed; scored against the documents).

Every metric degrades to ``None`` on degenerate input (fewer than two non-noise
clusters, missing inputs, empty vocabulary). The evaluator never raises.
"""

import logging

import numpy as np
from gensim.corpora import Dictionary
from gensim.models import CoherenceModel
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import silhouette_score

logger = logging.getLogger("orrery." + __name__)

# Noise label produced by HDBSCAN for unclustered points.
NOISE_LABEL = -1


class TopicQualityEvaluator:
    """Compute topic/cluster quality metrics. Stateless; one public method."""

    def evaluate(
        self,
        labels,
        projection_coords=None,
        embeddings=None,
        topics_data: dict | None = None,
        documents: list[str] | None = None,
        language: str | None = "english",
        hdbscan_model=None,
        sample_size: int = 10000,
        random_state: int = 42,
        n_keywords: int = 10,
        cluster_space: str | None = None,
    ) -> dict:
        """Evaluate cluster and topic quality.

        Args:
            labels: Per-item cluster labels (``-1`` = noise), aligned to
                ``projection_coords`` / ``embeddings`` / ``documents``.
            projection_coords: ``(n, 2|3)`` UMAP/PCA coordinates, or ``None``.
            embeddings: ``(n, dim)`` original vectors, or ``None``.
            topics_data: ``{topic_id: [(word, score), ...]}`` for diversity/coherence.
            documents: Per-item document strings, aligned to ``labels``.
            language: Stop-words language for the coherence tokenizer (sklearn
                supports ``"english"`` or ``None``; mirrors the c-TF-IDF step).
            hdbscan_model: Fitted HDBSCAN model (for DBCV via ``relative_validity_``).
            sample_size: Max points used for silhouette (cost guard for large N).
            random_state: Seed for silhouette sampling.
            n_keywords: Number of top keywords per topic to consider.
            cluster_space: Echoed into the result for provenance ("projection" /
                "embedding"); not used in any computation.

        Returns:
            A dict of metrics (float or ``None``) plus meta fields.
        """
        labels = np.asarray(labels)

        # Honour the "never raises" contract: drop any input whose length does not
        # match labels rather than letting a boolean-mask mismatch raise later.
        n = len(labels)
        if embeddings is not None and len(embeddings) != n:
            logger.warning("embeddings length != labels (%d != %d); ignoring", len(embeddings), n)
            embeddings = None
        if projection_coords is not None and len(projection_coords) != n:
            logger.warning(
                "projection_coords length != labels (%d != %d); ignoring",
                len(projection_coords),
                n,
            )
            projection_coords = None
        if documents is not None and len(documents) != n:
            logger.warning("documents length != labels (%d != %d); ignoring", len(documents), n)
            documents = None

        result: dict = {
            "dbcv": None,
            "silhouette_embedding": None,
            "silhouette_projection": None,
            "topic_diversity": None,
            "coherence_cv": None,
            "coherence_umass": None,
            "num_clusters_evaluated": 0,
            "sampled": False,
            "sample_size": sample_size,
            "cluster_space": cluster_space,
        }

        # DBCV — only meaningful for a fitted HDBSCAN model.
        if hdbscan_model is not None:
            rv = getattr(hdbscan_model, "relative_validity_", None)
            if rv is not None:
                result["dbcv"] = float(rv)

        non_noise = labels != NOISE_LABEL
        n_clusters = len(set(labels[non_noise].tolist()))
        result["num_clusters_evaluated"] = n_clusters

        # Silhouette needs at least two clusters.
        if n_clusters >= 2:
            if embeddings is not None:
                result["silhouette_embedding"] = self._silhouette(
                    embeddings, labels, non_noise, "cosine", sample_size, random_state, result
                )
            if projection_coords is not None:
                result["silhouette_projection"] = self._silhouette(
                    projection_coords,
                    labels,
                    non_noise,
                    "euclidean",
                    sample_size,
                    random_state,
                    result,
                )

        # Topic diversity (cheap, keyword-only).
        if topics_data:
            result["topic_diversity"] = self._topic_diversity(topics_data, n_keywords)

        # Coherence (C_v + U_Mass) via gensim.
        if documents and topics_data:
            cv, umass = self._coherence(documents, topics_data, language, n_keywords)
            result["coherence_cv"] = cv
            result["coherence_umass"] = umass

        return result

    def _silhouette(self, X, labels, non_noise, metric, sample_size, random_state, result):
        """Silhouette over non-noise points; optionally subsampled."""
        X = np.asarray(X, dtype=np.float64)
        Xs = X[non_noise]
        ys = labels[non_noise]
        n = len(ys)
        if n < 3:
            return None
        ss = None
        if sample_size and sample_size < n:
            ss = sample_size
            result["sampled"] = True
        try:
            return float(
                silhouette_score(Xs, ys, metric=metric, sample_size=ss, random_state=random_state)
            )
        except Exception as e:  # e.g. a subsample collapsing to one cluster
            logger.warning("silhouette (%s) failed: %s", metric, e)
            return None

    def _topic_diversity(self, topics_data: dict, n_keywords: int):
        """Fraction of unique words across all topics' top-N keywords."""
        all_words: list[str] = []
        for topic_id, keywords in topics_data.items():
            if topic_id == NOISE_LABEL:
                continue
            all_words.extend(w for w, _ in keywords[:n_keywords])
        if not all_words:
            return None
        return len(set(all_words)) / len(all_words)

    def _coherence(self, documents, topics_data, language, n_keywords):
        """Compute C_v and U_Mass coherence via gensim. Returns (cv, umass)."""
        try:
            analyzer = CountVectorizer(stop_words=language).build_analyzer()
            texts = [toks for toks in (analyzer(doc) for doc in documents) if toks]
            if not texts:
                return None, None

            dictionary = Dictionary(texts)
            topics = []
            for topic_id, keywords in topics_data.items():
                if topic_id == NOISE_LABEL:
                    continue
                words = [w for w, _ in keywords[:n_keywords] if w in dictionary.token2id]
                if len(words) >= 2:
                    topics.append(words)
            if not topics:
                return None, None

            corpus = [dictionary.doc2bow(t) for t in texts]
            cv = self._coherence_value(topics, texts, dictionary, corpus, "c_v")
            umass = self._coherence_value(topics, texts, dictionary, corpus, "u_mass")
            return cv, umass
        except Exception as e:
            logger.warning("coherence computation failed: %s", e)
            return None, None

    def _coherence_value(self, topics, texts, dictionary, corpus, measure):
        """Single gensim coherence measure; ``None`` on failure."""
        try:
            kwargs = {"topics": topics, "dictionary": dictionary, "coherence": measure}
            if measure == "u_mass":
                kwargs["corpus"] = corpus
            else:
                kwargs["texts"] = texts
            return float(CoherenceModel(**kwargs).get_coherence())
        except Exception as e:
            logger.warning("coherence (%s) failed: %s", measure, e)
            return None
