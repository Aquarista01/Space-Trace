import { objectCategory } from "@/lib/objectDisplay";

export function toRatio(value) {
  const n = Number(value ?? 0);
  return n > 1 ? n / 100 : n;
}

export function filterObjectsByRecognition(objects, recognition) {
  const min = recognition.minConfidence / 100;
  const categories = recognition.categories;

  return objects.filter((obj) => {
    if (categories.length > 0 && !categories.includes(objectCategory(obj.label))) return false;
    if (min > 0 && obj.last_seen && toRatio(obj.last_seen.confidence) < min) return false;
    return true;
  });
}

export function filterPendingByRecognition(pending, recognition) {
  const min = recognition.duplicateThreshold / 100;
  return pending.filter((p) => toRatio(p.score) >= min);
}