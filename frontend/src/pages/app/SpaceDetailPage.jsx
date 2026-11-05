import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import { spaceIcon, formatDateTime } from "@/lib/spaceDisplay";
import { getScenes, getSpace, getSpacesList, mergeSpaces, updateSpace } from "@/lib/spacesApi";
import ImageViewerDialog from "@/components/common/ImageViewerDialog";
import toast from "react-hot-toast";

export default function SpaceDetailPage() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allSpaces, setAllSpaces] = useState([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
const [viewingScene, setViewingScene] = useState(null);
  useEffect(() => {
    Promise.all([getSpace(spaceId), getScenes(spaceId)])
      .then(([spaceData, sceneData]) => {
        setSpace(spaceData);
        setScenes([...sceneData].reverse());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    getSpacesList()
      .then((list) => setAllSpaces(list.filter((s) => s.id !== spaceId)))
      .catch(() => setAllSpaces([]));
  }, [spaceId]);

  async function handleRename() {
  const name = nameDraft.trim();
  if (!name) return;
  try {
    const updated = await updateSpace(spaceId, { name, is_confirmed: true });
    setSpace(updated);
    setEditingName(false);
    toast.success("Space renamed");
  } catch (e) {
    toast.error(e.message || "Could not rename this space.");
  }
}

  function startEditingName() {
    setNameDraft(space?.name ?? "");
    setEditingName(true);
  }

  async function handleMerge() {
  if (!mergeTarget) return;
  setMerging(true);
  try {
    await mergeSpaces(mergeTarget, spaceId);
    toast.success("Spaces merged");
    navigate(`/dashboard/spaces/${mergeTarget}`);
  } catch (e) {
    toast.error(e.message || "Could not merge these spaces.");
  } finally {
    setMerging(false);
  }
}

  return (
    <>
      <Topbar
        title={space?.name ?? "Space"}
        description="Scenes identified as the same physical space are linked together to create a persistent visual history."
      />
      <main className="p-8">
        <Link to="/dashboard/spaces" className="text-sm font-medium text-slate-500 hover:underline">
          ← Back to My Spaces
        </Link>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {loading && <p className="mt-4 text-sm text-slate-400">Loading...</p>}

        {space && (
          <div className="mt-5 grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-trace-50 text-2xl">
                  {spaceIcon(space.name)}
                </div>

                <div className="mt-4">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename()}
                        placeholder="e.g. Bedroom"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-lg font-semibold text-ink outline-none focus:border-trace-500"
                      />
                      <button onClick={handleRename} className="text-sm font-semibold text-trace-700 hover:underline">
                        Save
                      </button>
                      <button onClick={() => setEditingName(false)} className="text-sm text-slate-400 hover:underline">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={startEditingName} className="group flex items-center gap-2 text-left">
                      <h3 className="text-lg font-semibold text-ink">{space.name ?? "Unnamed space"}</h3>
                      <span className="text-xs font-medium text-trace-600 opacity-0 group-hover:opacity-100">
                        Rename
                      </span>
                    </button>
                  )}
                  <p className="mt-1 text-sm text-slate-500">Recurring physical space</p>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Indexed scenes</span>
                    <span className="font-semibold text-ink">{space.scene_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Recent changes</span>
                    <span className="font-semibold text-ink">{space.recent_changes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Last updated</span>
                    <span className="font-semibold text-ink">{formatDateTime(space.last_updated)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/dashboard/spaces/${spaceId}/diff`)}
                  className="mt-5 w-full rounded-xl bg-trace-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700"
                >
                  Compare Scenes
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-ink">SpaceTrace</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Scenes identified as the same physical space are linked together to create a
                  persistent visual history.
                </p>
              </div>

              {allSpaces.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-ink">Is this the same space as another one?</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Merge this into another space if it was split by mistake.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <select
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
                    >
                      <option value="">Select a space...</option>
                      {allSpaces.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name ?? "Unnamed space"}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleMerge}
                      disabled={!mergeTarget || merging}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {merging ? "Merging..." : "Merge"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Room History</h3>
                  <p className="mt-1 text-sm text-slate-500">Rewind through previously indexed states.</p>
                </div>
                <span className="text-sm text-slate-400">
                  {scenes.length} scene{scenes.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {scenes.map((scene, i) => (
                  <div
                    key={scene.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <img src={scene.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-trace-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Latest
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{formatDateTime(scene.taken_at)}</p>
                      <p className="mt-1 text-sm text-slate-500">{scene.object_count} objects detected</p>
                    </div>

                                       <button
                      onClick={() => setViewingScene(scene)}
                      className="shrink-0 text-sm font-semibold text-trace-700 hover:underline"
                    >
                      View Scene
                    </button>
                  </div>
                ))}

                {scenes.length === 0 && !loading && (
                  <p className="text-sm text-slate-500">No scenes indexed for this space yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
         <ImageViewerDialog
        open={!!viewingScene}
        src={viewingScene?.media_url}
        title={space?.name ?? "Scene"}
        subtitle={viewingScene ? `${formatDateTime(viewingScene.taken_at)} · ${viewingScene.object_count} objects detected` : ""}
        onClose={() => setViewingScene(null)}
      />
      </main>
    </>
  );
}