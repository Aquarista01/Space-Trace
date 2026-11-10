import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import { createDiff, getLatestDiff, getScenes, getSpace } from "@/lib/spacesApi";
import { objectIcon } from "@/lib/objectDisplay";
import { formatDateTime, describeChange } from "@/lib/spaceDisplay";
import toast from "react-hot-toast";
const CHANGE_META = {
  appeared: { symbol: "+", label: "Appeared", color: "text-emerald-700", bg: "bg-emerald-50", ring: "#10b981" },
  disappeared: { symbol: "−", label: "Not detected", color: "text-rose-700", bg: "bg-rose-50", ring: "#e11d48" },
  moved: { symbol: "~", label: "Moved", color: "text-amber-700", bg: "bg-amber-50", ring: "#d97706" },
  unchanged: { symbol: "=", label: "Unchanged", color: "text-slate-600", bg: "bg-slate-100", ring: "#64748b" },
};

function BBoxOverlay({ items, side }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-full w-full">
        {items
          .filter((item) => item[side])
          .map((item, idx) => (
            <div
              key={idx}
              className="absolute rounded-md border-2"
              style={{
                left: `${item[side].x * 100}%`,
                top: `${item[side].y * 100}%`,
                width: `${item[side].w * 100}%`,
                height: `${item[side].h * 100}%`,
                borderColor: CHANGE_META[item.change_type].ring,
              }}
            />
          ))}
      </div>
    </div>
  );
}

export default function SpaceDiffPage() {
  const { spaceId } = useParams();
  const [space, setSpace] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [sceneA, setSceneA] = useState("");
  const [sceneB, setSceneB] = useState("");
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

    useEffect(() => {
    Promise.all([getSpace(spaceId), getScenes(spaceId)])
      .then(([spaceData, sceneData]) => {
        setSpace(spaceData);
        const ordered = [...sceneData].reverse();
        setScenes(ordered);
        if (ordered.length >= 2) {
          setSceneA(ordered[1].id);
          setSceneB(ordered[0].id);
        }
      })
      .catch((e) => setError(e.message));

    getLatestDiff(spaceId)
      .then((result) => {
        setDiff(result);
        setSceneA(result.scene_a_id);
        setSceneB(result.scene_b_id);
      })
      .catch(() => {
        // Chưa từng so sánh không gian này — giữ trạng thái trống như cũ
      });
  }, [spaceId]);

  const summary = useMemo(() => {
    if (!diff) return null;
    const counts = { appeared: 0, disappeared: 0, moved: 0, unchanged: 0 };
    diff.items.forEach((item) => {
      counts[item.change_type] = (counts[item.change_type] ?? 0) + 1;
    });
    return counts;
  }, [diff]);

  const sceneAInfo = scenes.find((s) => s.id === sceneA);
  const sceneBInfo = scenes.find((s) => s.id === sceneB);

 const runCompare = async () => {
  if (!sceneA || !sceneB) return;
  setError("");
  setBusy(true);
  try {
    const result = await createDiff({ space_id: spaceId, scene_a_id: sceneA, scene_b_id: sceneB });
    setDiff(result);
    toast.success("Comparison updated");
  } catch (e) {
    const message = e.message || "Could not compare these scenes.";
    setError(message);
    toast.error(message);
  } finally {
    setBusy(false);
  }
};

  return (
    <>
      <Topbar
        title={`${space?.name ?? "Space"} · Room Diff`}
        description="Compare two versions of the same physical space."
      />

      <main className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to={`/dashboard/spaces/${spaceId}`} className="text-sm font-medium text-trace-700 hover:underline">
            ← Back to {space?.name ?? "Space"}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sceneA}
              onChange={(e) => setSceneA(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
            >
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {formatDateTime(scene.taken_at)}
                </option>
              ))}
            </select>

            <span className="text-slate-400">→</span>

            <select
              value={sceneB}
              onChange={(e) => setSceneB(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
            >
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {formatDateTime(scene.taken_at)}
                </option>
              ))}
            </select>

            <button
              onClick={runCompare}
              disabled={!sceneA || !sceneB || sceneA === sceneB || busy}
              className="rounded-xl bg-trace-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700 disabled:opacity-50"
            >
              {busy ? "Comparing..." : "Compare"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {scenes.length < 2 && (
          <p className="mt-4 text-sm text-slate-500">Need at least 2 indexed scenes in this space to compare.</p>
        )}

        {diff && summary && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(CHANGE_META).map(([type, meta]) => (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${meta.bg} ${meta.color}`}
                  >
                    {meta.symbol}
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-ink">{summary[type]}</p>
                    <p className="text-xs text-slate-500">{meta.label}</p>
                  </div>
                </div>
              ))}
            </section>

           <section className="mt-6 grid gap-4 sm:grid-cols-2">
  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
    <img src={diff.scene_a_url} alt="Before" className="max-h-full max-w-full object-contain" />
    <BBoxOverlay items={diff.items} side="bbox_a" />
    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow">
      Before · {formatDateTime(sceneAInfo?.taken_at)}
    </span>
  </div>

  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
    <img src={diff.scene_b_url} alt="After" className="max-h-full max-w-full object-contain" />
    <BBoxOverlay items={diff.items} side="bbox_b" />
    <span className="absolute left-3 top-3 rounded-full bg-trace-600 px-3 py-1 text-xs font-semibold text-white shadow">
      After · {formatDateTime(sceneBInfo?.taken_at)}
    </span>
  </div>
</section>

            <section className="mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Detected Changes</h3>
                  <p className="mt-1 text-sm text-slate-500">Physical differences between the selected scene states.</p>
                </div>
                <span className="text-sm text-slate-400">{diff.items.length} tracked results</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {diff.items.map((item, i) => {
                  const meta = CHANGE_META[item.change_type];
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${meta.bg} ${meta.color}`}
                      >
                        {meta.symbol}
                      </span>
                      <span className="text-xl">{objectIcon(item.object_label ?? "")}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{item.object_label ?? "Unknown object"}</p>
                        <p className="truncate text-xs text-slate-500">{describeChange(item)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
                {diff.items.length === 0 && (
                  <p className="col-span-2 py-8 text-center text-sm text-slate-500">
                    No objects detected in either scene.
                  </p>
                )}
              </div>

              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                <strong>Note:</strong> "Not detected" does not necessarily mean an object is physically missing. The
                object may be occluded, outside the camera view, or below the detection confidence threshold.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}