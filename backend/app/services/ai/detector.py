import numpy as np
from PIL import Image
from ultralytics import YOLO

_model: YOLO | None = None


def get_model() -> YOLO:
    global _model
    if _model is None:
        _model = YOLO("yolov8n.pt")
    return _model


def detect_from_image(image: Image.Image, confidence_threshold: float = 0.4) -> list[dict]:
    model = get_model()
    results = model.predict(np.array(image), conf=confidence_threshold, verbose=False)
    detections = []

    for result in results:
        width, height = result.orig_shape[1], result.orig_shape[0]
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            label = result.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            detections.append({
                "label": label,
                "confidence": confidence,
                "bbox_x": x1 / width,
                "bbox_y": y1 / height,
                "bbox_w": (x2 - x1) / width,
                "bbox_h": (y2 - y1) / height,
            })

    return detections