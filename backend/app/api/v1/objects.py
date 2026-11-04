import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.object import ObjectEntity
from app.models.observation import Observation
from app.models.source_media import SourceMedia
from app.models.space import Space

from app.schemas.objects import (
    LastSeenOut,
    ObjectListItemOut,
    ObjectUpdateIn,
    ObservationOut,
    PendingMatchOut
)
from app.services import storage
import logging
import time

logger = logging.getLogger("spacetrace.timing")

router = APIRouter(prefix="/objects", tags=["Objects"])


def _latest_observations_by_object(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, Observation]:
    stmt = (
        select(Observation)
        .where(Observation.user_id == user_id, Observation.object_id.isnot(None))
        .distinct(Observation.object_id)
        .order_by(
            Observation.object_id,
            func.coalesce(Observation.observed_at, Observation.created_at).desc(),
        )
    )
    rows = db.execute(stmt).scalars().all()
    return {row.object_id: row for row in rows}

def _build_last_seen_map(
    db: Session, latest_map: dict[uuid.UUID, Observation]
) -> dict[uuid.UUID, LastSeenOut]:
    media_ids = {obs.media_id for obs in latest_map.values()}
    media_rows = db.query(SourceMedia).filter(SourceMedia.id.in_(media_ids)).all() if media_ids else []
    media_keys = {m.id: m.minio_key for m in media_rows}

    space_ids = {obs.space_id for obs in latest_map.values() if obs.space_id}
    space_rows = db.query(Space).filter(Space.id.in_(space_ids)).all() if space_ids else []
    space_names = {s.id: s.name for s in space_rows}

    result = {}
    for object_id, obs in latest_map.items():
        key = media_keys.get(obs.media_id)
        if key is None:
            continue
        result[object_id] = LastSeenOut(
            observed_at=obs.observed_at,
            space_id=obs.space_id,
            space_name=space_names.get(obs.space_id),
            media_id=obs.media_id,
            image_url=storage.get_presigned_url(key),
            confidence=obs.confidence,
            bbox_x=obs.bbox_x,
            bbox_y=obs.bbox_y,
            bbox_w=obs.bbox_w,
            bbox_h=obs.bbox_h,
        )
    return result


@router.get("", response_model=list[ObjectListItemOut])
def list_objects(db: Session = Depends(get_db), user=Depends(get_current_user)):
    t0 = time.perf_counter()
    objects = (
        db.query(ObjectEntity)
        .filter_by(user_id=user.id)
        .order_by(ObjectEntity.created_at.desc())
        .all()
    )
    t1 = time.perf_counter()
    logger.info("list: DB query objects %.1fms (%d rows)", (t1 - t0) * 1000, len(objects))

    latest_map = _latest_observations_by_object(db, user.id)
    t2 = time.perf_counter()
    logger.info("list: latest observations %.1fms", (t2 - t1) * 1000)

    last_seen_map = _build_last_seen_map(db, latest_map)
    t3 = time.perf_counter()
    logger.info("list: presigned urls %.1fms", (t3 - t2) * 1000)

    return [
        ObjectListItemOut(
            id=obj.id,
            label=obj.label,
            display_name=obj.display_name,
            is_confirmed=obj.is_confirmed,
            last_seen=last_seen_map.get(obj.id),
        )
        for obj in objects
    ]

@router.get("/{object_id}", response_model=ObjectListItemOut)
def get_object(object_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Object not found")

    latest = (
        db.query(Observation)
        .filter_by(user_id=user.id, object_id=object_id)
        .order_by(func.coalesce(Observation.observed_at, Observation.created_at).desc())
        .first()
    )

    last_seen_map = _build_last_seen_map(db, {object_id: latest}) if latest else {}

    return ObjectListItemOut(
        id=obj.id,
        label=obj.label,
        display_name=obj.display_name,
        is_confirmed=obj.is_confirmed,
        last_seen=last_seen_map.get(object_id),
    )


@router.get("/{object_id}/history", response_model=list[ObservationOut])
def get_object_history(object_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Object not found")

    observations = (
        db.query(Observation)
        .filter_by(user_id=user.id, object_id=object_id)
        .order_by(func.coalesce(Observation.observed_at, Observation.created_at).desc())
        .all()
    )

    media_ids = {obs.media_id for obs in observations}
    media_rows = db.query(SourceMedia).filter(SourceMedia.id.in_(media_ids)).all() if media_ids else []
    media_keys = {m.id: m.minio_key for m in media_rows}

    space_ids = {obs.space_id for obs in observations if obs.space_id}
    space_rows = db.query(Space).filter(Space.id.in_(space_ids)).all() if space_ids else []
    space_names = {s.id: s.name for s in space_rows}

    result = []
    for obs in observations:
        key = media_keys.get(obs.media_id)
        if key is None:
            continue
        result.append(ObservationOut(
            id=obs.id,
            observed_at=obs.observed_at,
            space_id=obs.space_id,
            space_name=space_names.get(obs.space_id),
            media_id=obs.media_id,
            image_url=storage.get_presigned_url(key),
            confidence=obs.confidence,
            bbox_x=obs.bbox_x,
            bbox_y=obs.bbox_y,
            bbox_w=obs.bbox_w,
            bbox_h=obs.bbox_h,
        ))
    return result
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Object not found")

    t0 = time.perf_counter()
    observations = (
        db.query(Observation)
        .filter_by(user_id=user.id, object_id=object_id)
        .order_by(func.coalesce(Observation.observed_at, Observation.created_at).desc())
        .all()
    )
    t1 = time.perf_counter()
    logger.info("history: DB query %.1fms (%d rows)", (t1 - t0) * 1000, len(observations))

    media_ids = {obs.media_id for obs in observations}
    media_rows = db.query(SourceMedia).filter(SourceMedia.id.in_(media_ids)).all() if media_ids else []
    media_keys = {m.id: m.minio_key for m in media_rows}
    t2 = time.perf_counter()
    logger.info("history: media lookup %.1fms", (t2 - t1) * 1000)

    result = []
    for obs in observations:
        key = media_keys.get(obs.media_id)
        if key is None:
            continue
        result.append(ObservationOut(
            id=obs.id,
            observed_at=obs.observed_at,
            space_id=obs.space_id,
            media_id=obs.media_id,
            image_url=storage.get_presigned_url(key),
            confidence=obs.confidence,
            bbox_x=obs.bbox_x,
            bbox_y=obs.bbox_y,
            bbox_w=obs.bbox_w,
            bbox_h=obs.bbox_h,
        ))
    t3 = time.perf_counter()
    logger.info("history: presigned urls (%d items) %.1fms", len(result), (t3 - t2) * 1000)

    return result

@router.patch("/{object_id}", response_model=ObjectListItemOut)
def update_object(
    object_id: uuid.UUID,
    payload: ObjectUpdateIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Object not found")

    if payload.display_name is not None:
        obj.display_name = payload.display_name
    if payload.is_confirmed is not None:
        obj.is_confirmed = payload.is_confirmed

    db.commit()
    db.refresh(obj)

    latest = (
        db.query(Observation)
        .filter_by(user_id=user.id, object_id=object_id)
        .order_by(func.coalesce(Observation.observed_at, Observation.created_at).desc())
        .first()
    )
    last_seen_map = _build_last_seen_map(db, {object_id: latest}) if latest else {}

    return ObjectListItemOut(
        id=obj.id,
        label=obj.label,
        display_name=obj.display_name,
        is_confirmed=obj.is_confirmed,
        last_seen=last_seen_map.get(object_id),
    )


@router.delete("/{object_id}", status_code=204)
def delete_object(object_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Object not found")

    db.delete(obj)
    db.commit()

@router.get("/pending-review", response_model=list[PendingMatchOut])
def list_pending_reviews(db: Session = Depends(get_db), user=Depends(get_current_user)):
    objects = (
        db.query(ObjectEntity)
        .filter(ObjectEntity.user_id == user.id, ObjectEntity.pending_match_id.isnot(None))
        .all()
    )
    candidate_ids = {o.pending_match_id for o in objects}
    candidates = db.query(ObjectEntity).filter(ObjectEntity.id.in_(candidate_ids)).all() if candidate_ids else []
    candidates_by_id = {c.id: c for c in candidates}

    return [
        PendingMatchOut(
            id=obj.id,
            label=obj.label,
            display_name=obj.display_name,
            candidate_id=obj.pending_match_id,
            candidate_label=candidates_by_id[obj.pending_match_id].label if obj.pending_match_id in candidates_by_id else None,
            candidate_display_name=candidates_by_id[obj.pending_match_id].display_name if obj.pending_match_id in candidates_by_id else None,
            score=obj.pending_match_score,
        )
        for obj in objects
    ]


@router.post("/{object_id}/confirm-match", response_model=ObjectListItemOut)
def confirm_match(object_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id or obj.pending_match_id is None:
        raise HTTPException(404, "No pending match for this object")

    target = db.get(ObjectEntity, obj.pending_match_id)
    if target is None:
        obj.pending_match_id = None
        obj.pending_match_score = None
        db.commit()
        raise HTTPException(409, "Candidate object no longer exists")

    db.query(Observation).filter_by(object_id=obj.id).update({"object_id": target.id})
    db.delete(obj)
    db.commit()
    db.refresh(target)

    latest_map = _latest_observations_by_object(db, user.id)
    last_seen_map = _build_last_seen_map(db, latest_map)
    return ObjectListItemOut(
        id=target.id,
        label=target.label,
        display_name=target.display_name,
        is_confirmed=target.is_confirmed,
        last_seen=last_seen_map.get(target.id),
    )


@router.post("/{object_id}/dismiss-match", response_model=ObjectListItemOut)
def dismiss_match(object_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    obj = db.get(ObjectEntity, object_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Object not found")

    obj.pending_match_id = None
    obj.pending_match_score = None
    db.commit()
    db.refresh(obj)

    latest_map = _latest_observations_by_object(db, user.id)
    last_seen_map = _build_last_seen_map(db, latest_map)
    return ObjectListItemOut(
        id=obj.id,
        label=obj.label,
        display_name=obj.display_name,
        is_confirmed=obj.is_confirmed,
        last_seen=last_seen_map.get(obj.id),
    )