import numpy as np

from .config import MODEL_NAME


class E5Embedder:
    """Pembungkus multilingual-e5. Prefix 'passage:'/'query:' wajib untuk model E5."""

    def __init__(self, model_name: str = MODEL_NAME):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model_name)

    def passages(self, texts):
        vecs = self.model.encode(
            ["passage: " + t for t in texts], normalize_embeddings=True, batch_size=16
        )
        return np.asarray(vecs)

    def query(self, text):
        return np.asarray(self.model.encode("query: " + text, normalize_embeddings=True))
