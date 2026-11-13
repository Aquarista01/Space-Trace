import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
import math
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.diff_item import DiffItem
from app.models.diff_result import DiffResult
from app.models.object import ObjectEntity
from app.models.observation import Observation
from app.models.scene_state import SceneState
from app.models.source_media import SourceMedia
from app.models.space import Space
from app.schemas.space import (
    DiffCreate,
    DiffItemOut,
    DiffResultOut,
    SceneOut,
    SpaceOut,
    SpaceUpdate,
    MergeSpacesIn,
    BBoxOut,

)
from app.services import diffing, storage

router = APIRouter(prefix="/spaces", tags=["Spaces"])


@router.post("/{space_id}/merge", response_model=SpaceOut)
def merge_spaces(
    space_id: uuid.UUID,
    payload: MergeSpacesIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if space_id == payload.source_id:
        raise HTTPException(400, "Cannot merge a space into itself")

    target = db.get(Space, space_id)
    source = db.get(Space, payload.source_id)

    if target is None or target.user_id != user.id:
        raise HTTPException(404, "Target space not found")
    if source is None or source.user_id != user.id:
        raise HTTPException(404, "Source space not found")

    db.query(SceneState).filter_by(space_id=source.id).update({"space_id": target.id})
    db.query(Observation).filter_by(space_id=source.id).update({"space_id": target.id})
    db.query(DiffResult).filter_by(space_id=source.id).update({"space_id": target.id})
    db.delete(source)
    db.commit()

    return get_space(space_id, db, user)

def _change_counts(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, int]:
    latest_sub = (
        db.query(DiffResult.space_id, func.max(DiffResult.created_at).label("max_created_at"))
        .filter(DiffResult.user_id == user_id)
        .group_by(DiffResult.space_id)
        .subquery()
    )

    latest_diffs = (
        db.query(DiffResult)
        .join(
            latest_sub,
            (DiffResult.space_id == latest_sub.c.space_id)
            & (DiffResult.created_at == latest_sub.c.max_created_at),
        )
        .all()
    )
    diff_ids = [d.id for d in latest_diffs]
    diff_to_space = {d.id: d.space_id for d in latest_diffs}

    if not diff_ids:
        return {}

    rows = (
        db.query(DiffItem.diff_id, func.count(DiffItem.id))
        .filter(DiffItem.diff_id.in_(diff_ids), DiffItem.change_type != "unchanged")
        .group_by(DiffItem.diff_id)
        .all()
    )

    return {diff_to_space[diff_id]: count for diff_id, count in rows}

@router.get("/{space_id}/diffs/latest", response_model=DiffResultOut)
def get_latest_diff(space_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    space = db.get(Space, space_id)
    if space is None or space.user_id != user.id:
        raise HTTPException(404, "Space not found")

    diff = (
        db.query(DiffResult)
        .filter_by(user_id=user.id, space_id=space_id)
        .order_by(DiffResult.created_at.desc())
        .first()
    )
    if diff is None:
        raise HTTPException(404, "No comparison has been made for this space yet")

    return _build_diff_response(db, diff)
    

def _space_change_count(db: Session, space_id: uuid.UUID) -> int:
    latest_diff = (
        db.query(DiffResult)
        .filter(DiffResult.space_id == space_id)
        .order_by(DiffResult.created_at.desc())
        .first()
    )
    if latest_diff is None:
        return 0

    return (
        db.query(func.count(DiffItem.id))
        .filter(DiffItem.diff_id == latest_diff.id, DiffItem.change_type != "unchanged")
        .scalar()
    ) or 0


@router.get("", response_model=list[SpaceOut])
def list_spaces(db: Session = Depends(get_db), user=Depends(get_current_user)):
    spaces = db.query(Space).filter_by(user_id=user.id).all()
    if not spaces:
        return []

    space_ids = [s.id for s in spaces]

    scene_counts = dict(
        db.query(SceneState.space_id, func.count(SceneState.id))
        .filter(SceneState.space_id.in_(space_ids))
        .group_by(SceneState.space_id)
        .all()
    )

    latest_sub = (
        db.query(SceneState.space_id, func.max(SceneState.taken_at).label("max_taken_at"))
        .filter(SceneState.space_id.in_(space_ids))
        .group_by(SceneState.space_id)
        .subquery()
    )
    latest_scenes = (
        db.query(SceneState)
        .join(
            latest_sub,
            (SceneState.space_id == latest_sub.c.space_id)
            & (SceneState.taken_at == latest_sub.c.max_taken_at),
        )
        .all()
    )
    latest_by_space = {s.space_id: s for s in latest_scenes}

    media_ids = {s.media_id for s in latest_scenes}
    media_rows = db.query(SourceMedia).filter(SourceMedia.id.in_(media_ids)).all() if media_ids else []
    media_keys = {m.id: m.minio_key for m in media_rows}

    change_counts = _change_counts(db, user.id)

    result = []
    for space in spaces:
        latest = latest_by_space.get(space.id)
        cover_url = None
        if latest:
            key = media_keys.get(latest.media_id)
            if key:
                cover_url = storage.get_presigned_url(key)

        result.append(SpaceOut(
            id=space.id,
            name=space.name,
            is_confirmed=space.is_confirmed,
            scene_count=scene_counts.get(space.id, 0),
            cover_url=cover_url,
            last_updated=latest.taken_at if latest else None,
            recent_changes=change_counts.get(space.id, 0),
        ))

    return result


@router.get("/{space_id}", response_model=SpaceOut)
def get_space(space_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    space = db.get(Space, space_id)
    if space is None or space.user_id != user.id:
        raise HTTPException(404, "Space not found")

    scene_count = db.query(SceneState).filter_by(space_id=space.id).count()
    latest = (
        db.query(SceneState)
        .filter_by(space_id=space.id)
        .order_by(SceneState.taken_at.desc())
        .first()
    )
    cover_url = None
    if latest:
        media = db.get(SourceMedia, latest.media_id)
        if media:
            cover_url = storage.get_presigned_url(media.minio_key)

    return SpaceOut(
        id=space.id,
        name=space.name,
        is_confirmed=space.is_confirmed,
        scene_count=scene_count,
        cover_url=cover_url,
        last_updated=latest.taken_at if latest else None,
        recent_changes=_space_change_count(db, space.id),
    )


@router.patch("/{space_id}", response_model=SpaceOut)
def update_space(
    space_id: uuid.UUID,
    payload: SpaceUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    space = db.get(Space, space_id)
    if space is None or space.user_id != user.id:
        raise HTTPException(404, "Space not found")

    if payload.name is not None:
        space.name = payload.name
    if payload.is_confirmed is not None:
        space.is_confirmed = payload.is_confirmed

    db.commit()
    db.refresh(space)
    return get_space(space_id, db, user)


@router.get("/{space_id}/scenes", response_model=list[SceneOut])
def list_scenes(space_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    space = db.get(Space, space_id)
    if space is None or space.user_id != user.id:
        raise HTTPException(404, "Space not found")

    scenes = (
        db.query(SceneState)
        .filter_by(space_id=space_id)
        .order_by(SceneState.taken_at.asc())
        .all()
    )
    if not scenes:
        return []

    scene_ids = [s.id for s in scenes]
    media_ids = {s.media_id for s in scenes}
    media_rows = db.query(SourceMedia).filter(SourceMedia.id.in_(media_ids)).all()
    media_keys = {m.id: m.minio_key for m in media_rows}

    counts = dict(
        db.query(Observation.scene_id, func.count(Observation.id))
        .filter(Observation.scene_id.in_(scene_ids))
        .group_by(Observation.scene_id)
        .all()
    )

    result = []
    for scene in scenes:
        key = media_keys.get(scene.media_id)
        result.append(SceneOut(
            id=scene.id,
            taken_at=scene.taken_at,
            media_url=storage.get_presigned_url(key) if key else "",
            object_count=counts.get(scene.id, 0),
        ))
    return result


@router.post("/diffs", response_model=DiffResultOut)
def create_diff(payload: DiffCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    space = db.get(Space, payload.space_id)
    if space is None or space.user_id != user.id:
        raise HTTPException(404, "Space not found")

    scene_a = db.get(SceneState, payload.scene_a_id)
    scene_b = db.get(SceneState, payload.scene_b_id)
    if not scene_a or not scene_b or scene_a.space_id != space.id or scene_b.space_id != space.id:
        raise HTTPException(400, "Both scenes must belong to the given space")

    diff = diffing.compute_diff(db, user.id, space.id, scene_a.id, scene_b.id)
    return _build_diff_response(db, diff)


@router.get("/diffs/{diff_id}", response_model=DiffResultOut)
def get_diff(diff_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    diff = db.get(DiffResult, diff_id)
    if diff is None or diff.user_id != user.id:
        raise HTTPException(404, "Diff not found")
    return _build_diff_response(db, diff)


def _build_diff_response(db: Session, diff: DiffResult) -> DiffResultOut:
    scene_a = db.get(SceneState, diff.scene_a_id)
    scene_b = db.get(SceneState, diff.scene_b_id)
    media_a = db.get(SourceMedia, scene_a.media_id) if scene_a else None
    media_b = db.get(SourceMedia, scene_b.media_id) if scene_b else None

    diff_items = db.query(DiffItem).filter_by(diff_id=diff.id).all()

    scene_a_obs = db.query(Observation).filter_by(scene_id=scene_a.id).all() if scene_a else []
    scene_b_obs = db.query(Observation).filter_by(scene_id=scene_b.id).all() if scene_b else []

    obs_ids = set()
    for item in diff_items:
        if item.observation_a_id:
            obs_ids.add(item.observation_a_id)
        if item.observation_b_id:
            obs_ids.add(item.observation_b_id)
    observations = db.query(Observation).filter(Observation.id.in_(obs_ids)).all() if obs_ids else []
    obs_by_id = {o.id: o for o in observations}

    object_ids = {i.object_id for i in diff_items if i.object_id}
    object_ids |= {o.object_id for o in scene_a_obs if o.object_id}
    object_ids |= {o.object_id for o in scene_b_obs if o.object_id}
    objects = db.query(ObjectEntity).filter(ObjectEntity.id.in_(object_ids)).all() if object_ids else []
    objects_by_id = {o.id: o for o in objects}

    def _bbox(obs_id):
        obs = obs_by_id.get(obs_id)
        if obs is None:
            return None
        return BBoxOut(x=obs.bbox_x, y=obs.bbox_y, w=obs.bbox_w, h=obs.bbox_h)

    def _center(o):
        return (o.bbox_x + o.bbox_w / 2, o.bbox_y + o.bbox_h / 2)

    def _nearest_label(obs_id, candidates):
        obs = obs_by_id.get(obs_id)
        if obs is None:
            return None
        cx, cy = _center(obs)
        best, best_dist = None, None
        for cand in candidates:
            if cand.id == obs.id or cand.object_id == obs.object_id:
                continue
            ox, oy = _center(cand)
            d = math.hypot(cx - ox, cy - oy)
            if best_dist is None or d < best_dist:
                best_dist, best = d, cand
        if best is None:
            return None
        obj = objects_by_id.get(best.object_id)
        return (obj.display_name or obj.label) if obj else None

    items = []
    for item in diff_items:
        obj = objects_by_id.get(item.object_id)
        label = (obj.display_name or obj.label) if obj else None
        items.append(DiffItemOut(
            object_id=item.object_id,
            object_label=label,
            change_type=item.change_type,
            confidence=item.confidence,
            bbox_a=_bbox(item.observation_a_id),
            bbox_b=_bbox(item.observation_b_id),
            nearest_label_a=_nearest_label(item.observation_a_id, scene_a_obs),
            nearest_label_b=_nearest_label(item.observation_b_id, scene_b_obs),
        ))

    return DiffResultOut(
        id=diff.id,
        scene_a_id=diff.scene_a_id,
        scene_b_id=diff.scene_b_id,
        scene_a_url=storage.get_presigned_url(media_a.minio_key) if media_a else "",
        scene_b_url=storage.get_presigned_url(media_b.minio_key) if media_b else "",
        items=items,
    )