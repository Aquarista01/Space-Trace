import math

from sqlalchemy.orm import Session

from app.models.diff_item import DiffItem
from app.models.diff_result import DiffResult
from app.models.observation import Observation

MOVE_THRESHOLD = 0.12


def _center(obs: Observation) -> tuple[float, float]:
    return (obs.bbox_x + obs.bbox_w / 2, obs.bbox_y + obs.bbox_h / 2)


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def compute_diff(db: Session, user_id, space_id, scene_a_id, scene_b_id) -> DiffResult:
    obs_a = {
        o.object_id: o
        for o in db.query(Observation).filter_by(scene_id=scene_a_id, user_id=user_id)
        if o.object_id is not None
    }
    obs_b = {
        o.object_id: o
        for o in db.query(Observation).filter_by(scene_id=scene_b_id, user_id=user_id)
        if o.object_id is not None
    }

    diff = DiffResult(
        user_id=user_id,
        space_id=space_id,
        scene_a_id=scene_a_id,
        scene_b_id=scene_b_id,
    )
    db.add(diff)
    db.flush()

    all_object_ids = set(obs_a.keys()) | set(obs_b.keys())

    for object_id in all_object_ids:
        a = obs_a.get(object_id)
        b = obs_b.get(object_id)

        if a and b:
            moved = _distance(_center(a), _center(b)) >= MOVE_THRESHOLD
            change_type = "moved" if moved else "unchanged"
            confidence = min(a.confidence, b.confidence)
            obs_a_id, obs_b_id = a.id, b.id
        elif a and not b:
            change_type = "disappeared"
            confidence = a.confidence
            obs_a_id, obs_b_id = a.id, None
        else:
            change_type = "appeared"
            confidence = b.confidence
            obs_a_id, obs_b_id = None, b.id

        db.add(DiffItem(
            diff_id=diff.id,
            object_id=object_id,
            change_type=change_type,
            observation_a_id=obs_a_id,
            observation_b_id=obs_b_id,
            confidence=confidence,
        ))

    db.commit()
    db.refresh(diff)
    return diff