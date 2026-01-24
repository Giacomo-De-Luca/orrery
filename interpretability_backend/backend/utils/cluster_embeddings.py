import numpy as np
import pandas as pd
from typing import Tuple
from hdbscan import HDBSCAN
import logging

logger = logging.getLogger('star_map.'+__name__)



def hdbscan_delegator(model, func: str, embeddings: np.ndarray = None):
    """Function used to select the HDBSCAN-like model for generating
    predictions and probabilities.

    Arguments:
        model: The cluster model.
        func: The function to use. Options:
                - "approximate_predict"
                - "all_points_membership_vectors"
                - "membership_vector"
        embeddings: Input embeddings for "approximate_predict"
                    and "membership_vector"
    """
    try:
        import hdbscan
    except (ImportError, ModuleNotFoundError):
        hdbscan = type("hdbscan", (), {"HDBSCAN": None})()

    # Approximate predict
    if func == "approximate_predict":
        if isinstance(model, hdbscan.HDBSCAN):
            predictions, probabilities = hdbscan.approximate_predict(model, embeddings)
            return predictions, probabilities

        str_type_model = str(type(model)).lower()
        if "cuml" in str_type_model and "hdbscan" in str_type_model:
            from cuml.cluster import hdbscan as cuml_hdbscan

            predictions, probabilities = cuml_hdbscan.approximate_predict(model, embeddings)
            return predictions, probabilities

        predictions = model.predict(embeddings)
        return predictions, None

    # All points membership
    if func == "all_points_membership_vectors":
        if isinstance(model, hdbscan.HDBSCAN):
            return hdbscan.all_points_membership_vectors(model)

        str_type_model = str(type(model)).lower()
        if "cuml" in str_type_model and "hdbscan" in str_type_model:
            from cuml.cluster import hdbscan as cuml_hdbscan

            return cuml_hdbscan.all_points_membership_vectors(model)

        return None

def _cluster_embeddings(
        self,
        umap_embeddings: np.ndarray,
        documents: pd.DataFrame,
        partial_fit: bool = False,
        y: np.ndarray = np.ndarray([]),
    ) -> Tuple[pd.DataFrame, np.ndarray]:
        """Cluster UMAP reduced embeddings with HDBSCAN.

        Arguments:
            umap_embeddings: The reduced sentence embeddings with UMAP
            documents: Dataframe with documents and their corresponding IDs
            partial_fit: Whether to run `partial_fit` for online learning
            y: Array of topics to use

        Returns:
            documents: Updated dataframe with documents and their corresponding IDs
                       and newly added Topics
            probabilities: The distribution of probabilities
        """
        logger.info("Cluster - Start clustering the reduced embeddings")


        hdbscan_model = HDBSCAN(
                min_cluster_size=self.min_topic_size,
                metric="euclidean",
                cluster_selection_method="eom",
                prediction_data=True,
            )
        
        if partial_fit:
            self.hdbscan_model = self.hdbscan_model.partial_fit(umap_embeddings)
            labels = self.hdbscan_model.labels_
            documents["Topic"] = labels
            self.topics_ = labels
        else:
            try:
                self.hdbscan_model.fit(umap_embeddings, y=y)
            except TypeError:
                self.hdbscan_model.fit(umap_embeddings)

            try:
                labels = self.hdbscan_model.labels_
            except AttributeError:
                labels = y
            documents["Topic"] = labels
            self._update_topic_size(documents)

        # Extract probabilities
        probabilities = None
        if hasattr(self.hdbscan_model, "probabilities_"):
            probabilities = self.hdbscan_model.probabilities_

            if self.calculate_probabilities(self.hdbscan_model):
                probabilities = hdbscan_delegator(self.hdbscan_model, "all_points_membership_vectors")

        if not partial_fit:
            self.topic_mapper_ = TopicMapper(self.topics_)
        logger.info("Cluster - Completed \u2713")
        return documents, probabilities


