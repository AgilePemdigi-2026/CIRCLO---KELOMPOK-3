"""Embedder palsu (bag-of-words hashing) untuk tes cepat tanpa mengunduh model."""
import re
import zlib

import numpy as np


class FakeEmbedder:
    D = 256

    def _vec(self, text):
        v = np.zeros(self.D)
        for w in re.findall(r"[a-z0-9]+", text.lower()):
            v[zlib.crc32(w.encode()) % self.D] += 1   # crc32: stabil antar-run (hash() tidak)
        n = np.linalg.norm(v)
        return v / n if n else v

    def passages(self, texts):
        return np.array([self._vec(t) for t in texts])

    def query(self, text):
        return self._vec(text)
