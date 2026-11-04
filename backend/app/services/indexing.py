import uuid
from io import BytesIO

from PIL import Image
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.object import ObjectEntity
from app.models.observation import Observation
from app.models.source_media import SourceMedia
from app.services import storage
from app.services.ai import detector, embedder
from app.models.scene_state import SceneState
from app.models.space import Space

MATCH_THRESHOLD = 0.82
REVIEW_THRESHOLD = 0.70
SPACE_MATCH_THRESHOLD = 0.75


def find_or_create_space(db: Session, user_id, embedding) -> Space:
    candidates = db.query(Space).filter(Space.user_id == user_id).all()

    best_match = None
    best_score = 0.0
    for candidate in candidates:
        if candidate.canonical_embedding is None:
            continue
        score = embedder.cosine_similarity(embedding, embedder.from_bytes(candidate.canonical_embedding))
        if score > best_score:
            best_score = score
            best_match = candidate

    if best_match and best_score >= SPACE_MATCH_THRESHOLD:
        return best_match

    new_space = Space(
        user_id=user_id,
        canonical_embedding=embedder.to_bytes(embedding),
    )
    db.add(new_space)
    db.flush()
    return new_space


def find_or_create_object(db: Session, user_id: uuid.UUID, label: str, embedding) -> ObjectEntity:
    candidates = (
        db.query(ObjectEntity)
        .filter(ObjectEntity.user_id == user_id, ObjectEntity.label == label)
        .all()
    )

    best_match = None
    best_score = 0.0
    for candidate in candidates:
        if candidate.canonical_embedding is None:
            continue
        score = embedder.cosine_similarity(embedding, embedder.from_bytes(candidate.canonical_embedding))
        if score > best_score:
            best_score = score
            best_match = candidate

    if best_match and best_score >= MATCH_THRESHOLD:
        return best_match

    new_object = ObjectEntity(
        user_id=user_id,
        label=label,
        canonical_embedding=embedder.to_bytes(embedding),
    )
    if best_match and best_score >= REVIEW_THRESHOLD:
        new_object.pending_match_id = best_match.id
        new_object.pending_match_score = best_score

    db.add(new_object)
    db.flush()
    return new_object


def process_media(db: Session, media: SourceMedia) -> None:
    if db.query(Observation).filter_by(media_id=media.id).first() is not None:
        return

    data = storage.get_s3().get_object(settings.S3_BUCKET, media.minio_key).read()
    image = Image.open(BytesIO(data)).convert("RGB")
    width, height = image.size

    scene_embedding = embedder.embed_image(image)
    space = find_or_create_space(db, media.user_id, scene_embedding)

    scene = SceneState(
        user_id=media.user_id,
        space_id=space.id,
        media_id=media.id,
        taken_at=media.taken_at or media.created_at,
    )
    db.add(scene)
    db.flush()

    detections = detector.detect_from_image(image)

    for det in detections:
        crop_box = (
            int(det["bbox_x"] * width),
            int(det["bbox_y"] * height),
            int((det["bbox_x"] + det["bbox_w"]) * width),
            int((det["bbox_y"] + det["bbox_h"]) * height),
        )
        crop = image.crop(crop_box)
        embedding = embedder.embed_image(crop)

        obj = find_or_create_object(db, media.user_id, det["label"], embedding)

        db.add(Observation(
            user_id=media.user_id,
            object_id=obj.id,
            media_id=media.id,
            space_id=space.id,
            scene_id=scene.id,
            class_label=det["label"],
            confidence=det["confidence"],
            bbox_x=det["bbox_x"],
            bbox_y=det["bbox_y"],
            bbox_w=det["bbox_w"],
            bbox_h=det["bbox_h"],
            embedding=embedder.to_bytes(embedding),
            observed_at=media.taken_at or media.created_at,
        ))

    media.index_status = "done"
    db.commit()