import numpy as np
import open_clip
import torch
from PIL import Image

_model = None
_preprocess = None

DEVICE = "cpu"


def get_model():
    global _model, _preprocess
    if _model is None:
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32-quickgelu", pretrained="openai"
        )
        _model = _model.to(DEVICE).eval()
    return _model, _preprocess


def embed_image(image: Image.Image) -> np.ndarray:
    model, preprocess = get_model()
    tensor = preprocess(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        features = model.encode_image(tensor)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.squeeze(0).cpu().numpy().astype(np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


def to_bytes(vector: np.ndarray) -> bytes:
    return vector.astype(np.float32).tobytes()


def from_bytes(data: bytes) -> np.ndarray:
    return np.frombuffer(data, dtype=np.float32)