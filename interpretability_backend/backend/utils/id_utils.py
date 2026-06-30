"""
Utility for handling duplicate IDs during embedding.
"""


class IDDeduplicator:
    """
    Stateful helper that keeps IDs unique while preserving the original value.

    Collision-only suffixing: the first time a base id is seen it is returned
    verbatim; subsequent collisions get ``_1``, ``_2``, ... Example:
    ``["cat", "cat", "cat"]`` -> ``["cat", "cat_1", "cat_2"]``.

    The suffix counter is bumped until a genuinely free id is found, so a
    generated suffix can never silently overwrite a real id that already
    contains that suffix (e.g. source ids ``["5", "5_1", "5"]`` map to
    ``["5", "5_1", "5_2"]``, not two ``"5_1"``).

    A single deduplicator instance must be shared across everything written to
    one collection (e.g. all splits of a dataset) for cross-source uniqueness.
    """

    def __init__(self):
        self._used: set[str] = set()
        self._next_suffix: dict[str, int] = {}

    def get_unique_id(self, base_id: str) -> str:
        """
        Return ``base_id`` unchanged if unused, else the next free
        ``base_id_N`` (1-based), recording it so future ids stay unique.
        """
        if base_id not in self._used:
            self._used.add(base_id)
            return base_id

        n = self._next_suffix.get(base_id, 1)
        candidate = f"{base_id}_{n}"
        while candidate in self._used:
            n += 1
            candidate = f"{base_id}_{n}"
        # Next collision on this base starts searching past the one just used.
        self._next_suffix[base_id] = n + 1
        self._used.add(candidate)
        return candidate
