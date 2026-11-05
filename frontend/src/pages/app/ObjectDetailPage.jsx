import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import ImageViewerDialog from "@/components/common/ImageViewerDialog";
import { getObject, getObjectHistory, updateObject } from "@/lib/objects";
import toast from "react-hot-toast";
import {
  objectIcon,
  objectCategory,
  CATEGORY_LABELS,
  displayName,
  formatConfidence,
  formatDate,
} from "@/lib/objectDisplay";

export default function ObjectDetailPage() {
  const { id } = useParams();
  const [object, setObject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [viewerImage, setViewerImage] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getObject(id), getObjectHistory(id)])
      .then(([obj, hist]) => {
        setObject(obj);
        setHistory(hist);
        setNameDraft(obj.display_name ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveName() {
  try {
    await updateObject(id, { display_name: nameDraft.trim() || null });
    setEditing(false);
    load();
    toast.success("Object renamed");
  } catch (e) {
    toast.error(e.message || "Could not rename this object.");
  }
}

  function openPhoto(entry) {
    if (!entry) return;
    setViewerImage({
      src: entry.image_url,
      title: entry.space_name ?? "Source photo",
      subtitle: `${formatDate(entry.observed_at)} · ${formatConfidence(entry.confidence)} confidence`,
    });
  }

  if (loading) {
    return (
      <>
        <Topbar title="Object" description="Loading..." />
        <main className="p-8" />
      </>
    );
  }

  if (error || !object) {
    return (
      <>
        <Topbar title="Object" description="Something went wrong." />
        <main className="p-8">
          <p className="text-sm text-rose-600">{error ?? "Object not found."}</p>
        </main>
      </>
    );
  }

  const lastSeen = object.last_seen;

  return (
    <>
      <Topbar
        title={displayName(object)}
        description="Object identity, last-seen evidence and observation history."
      />

      <main className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard/objects" className="text-sm font-medium text-slate-500 hover:text-ink">
            ← Back to My Objects
          </Link>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              Edit Object
            </button>
            <button
              onClick={() => {
                load();
                toast.success("Refreshed");
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              Find Again
            </button>
          </div>
        </div>

        {editing && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Object name"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-trace-400"
            />
            <button
              onClick={handleSaveName}
              className="rounded-lg bg-trace-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trace-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {lastSeen ? (
                  <button onClick={() => openPhoto(lastSeen)} className="block h-full w-full">
                    <img
                      src={lastSeen.image_url}
                      alt={displayName(object)}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    {objectIcon(object.label)}
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow">
                  Source photo
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Detected object · {lastSeen ? formatConfidence(lastSeen.confidence) : "—"}
              </p>
            </div>

            {lastSeen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last known visual location
                </p>
                <p className="text-lg font-semibold text-ink">
                  {lastSeen.space_name ?? (lastSeen.space_id ? "Unnamed space" : "Not linked to a space")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatConfidence(lastSeen.confidence)} confidence
                </p>

                <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
                  <p className="flex justify-between py-1">
                    <span className="text-slate-500">Object</span>
                    <span className="font-medium text-ink">{displayName(object)}</span>
                  </p>
                  <p className="flex justify-between py-1">
                    <span className="text-slate-500">Last observed</span>
                    <span className="font-medium text-ink">{formatDate(lastSeen.observed_at)}</span>
                  </p>
                </div>

                <button
                  onClick={() => openPhoto(lastSeen)}
                  className="mt-4 text-sm font-semibold text-trace-600 hover:text-trace-700"
                >
                  Open source photo →
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-trace-50 text-2xl">
                  {objectIcon(object.label)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-ink">{displayName(object)}</p>
                  <p className="text-sm text-slate-500">{CATEGORY_LABELS[objectCategory(object.label)]}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <Stat label="Status" value={lastSeen ? "Recently seen" : "Not seen yet"} />
                <Stat label="Observations" value={`${history.length} detected`} />
                <Stat
                  label="Current Space"
                  value={lastSeen ? (lastSeen.space_name ?? (lastSeen.space_id ? "Unnamed space" : "—")) : "—"}
                />
                <Stat label="Latest Confidence" value={lastSeen ? formatConfidence(lastSeen.confidence) : "—"} />
              </div>

              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                This location represents the latest visual observation in the indexed photo
                history. It does not guarantee the object's current physical location.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg font-semibold text-ink">Object History</p>
              <p className="mt-1 text-sm text-slate-500">Timeline of detected observations.</p>

              {history.length === 0 ? (
                <p className="mt-5 text-sm text-slate-400">No observations recorded yet.</p>
              ) : (
                <div className="relative mt-6 space-y-4 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-slate-200">
                  {history.map((obs, index) => (
                    <div key={obs.id} className="relative pl-10">
                      <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-trace-600">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-ink">
                              {obs.space_name ?? (obs.space_id ? "Unnamed space" : "Not linked to a space")}
                            </p>
                            {index === 0 && (
                              <span className="rounded-full bg-trace-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-trace-700">
                                Latest
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {formatConfidence(obs.confidence)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-400">
                          <span>{formatDate(obs.observed_at)}</span>
                          <button
                            onClick={() => openPhoto(obs)}
                            className="font-semibold text-trace-600 hover:text-trace-700"
                          >
                            View source →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ImageViewerDialog
        open={!!viewerImage}
        src={viewerImage?.src}
        title={viewerImage?.title}
        subtitle={viewerImage?.subtitle}
        onClose={() => setViewerImage(null)}
      />
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}