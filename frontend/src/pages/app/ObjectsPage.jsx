import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import { confirmMatch, dismissMatch, listObjects, listPendingMatches } from "@/lib/objects";
import { usePreferences } from "@/context/PreferencesContext";
import { filterObjectsByRecognition, filterPendingByRecognition } from "@/lib/recognition";

import {
  objectIcon,
  objectCategory,
  CATEGORY_LABELS,
  displayName,
  formatConfidence,
  formatDate,
} from "@/lib/objectDisplay";


function ObjectCard({ obj }) {
  const seen = obj.last_seen;
  const place = seen
    ? seen.space_name ?? (seen.space_id ? "Unnamed space" : "Not linked to a space")
    : "Not seen yet";

  return (
    <Link
      to={`/dashboard/objects/${obj.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl">
          {seen?.image_url ? (
            <img src={seen.image_url} alt={displayName(obj)} className="h-full w-full object-cover" />
          ) : (
            objectIcon(obj.label)
          )}
        </div>

        {seen && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {formatConfidence(seen.confidence)} match
          </span>
        )}
      </div>

      <p className="mt-4 truncate text-base font-semibold text-ink">{displayName(obj)}</p>
      <p className="mt-1 truncate text-sm text-slate-500">{place}</p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Last seen</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">
            {seen ? formatDate(seen.observed_at) : "—"}
          </p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-base text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}

export default function ObjectsPage() {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recent");
  const [pending, setPending] = useState([]);
const { recognition } = usePreferences();
const visibleObjects = useMemo(() => filterObjectsByRecognition(objects, recognition), [objects, recognition]);
const visiblePending = useMemo(() => filterPendingByRecognition(pending, recognition), [pending, recognition]);

  function loadObjects() {
    setLoading(true);
    listObjects()
      .then((data) => setObjects(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function loadPending() {
    listPendingMatches()
      .then((data) => setPending(data))
      .catch(() => setPending([]));
  }

  useEffect(() => {
    loadObjects();
    loadPending();
  }, []);

  async function handleConfirm(id) {
    await confirmMatch(id);
    loadPending();
    loadObjects();
  }

  async function handleDismiss(id) {
    await dismissMatch(id);
    loadPending();
  }

  const filtered = useMemo(() => {
    let list = visibleObjects;

    if (category !== "all") {
      list = list.filter((obj) => objectCategory(obj.label) === category);
    }

    if (search.trim()) {
      const text = search.trim().toLowerCase();
      list = list.filter(
        (obj) =>
          displayName(obj).toLowerCase().includes(text) ||
          obj.label.toLowerCase().includes(text)
      );
    }

    const sorted = [...list];
    if (sort === "recent") {
      sorted.sort((a, b) => {
        const at = a.last_seen?.observed_at ?? "";
        const bt = b.last_seen?.observed_at ?? "";
        return bt.localeCompare(at);
      });
    } else if (sort === "confidence") {
      sorted.sort((a, b) => (b.last_seen?.confidence ?? 0) - (a.last_seen?.confidence ?? 0));
    } else if (sort === "name") {
      sorted.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    }

    return sorted;
  }, [visibleObjects, category, search, sort]);

  return (
    <>
      <Topbar title="My Objects" description="Objects identified across your visual history." />

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Object Library</h3>
            <p className="mt-1 text-sm text-slate-500">
              {visibleObjects.length} object{visibleObjects.length === 1 ? "" : "s"} are currently being tracked.
            </p>
          </div>

          <Link
            to="/dashboard/photos"
            className="inline-flex items-center justify-center rounded-xl bg-trace-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700"
          >
            + Register Object
          </Link>
        </div>

        {visiblePending.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <p className="text-sm font-semibold text-amber-800">
              {visiblePending.length} possible duplicate{visiblePending.length === 1 ? "" : "s"} found
            </p>
            <p className="mt-1 text-sm text-amber-700">
              These objects look similar to another one already in your library. Confirm if
              they're the same, or dismiss to keep them separate.
            </p>

            <div className="mt-4 space-y-3">
              {visiblePending.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{p.display_name || p.label}</span> might be
                    the same as{" "}
                    <span className="font-semibold">
                      {p.candidate_display_name || p.candidate_label}
                    </span>{" "}
                    ({Math.round(p.score * 100)}% similar)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(p.id)}
                      className="flex-1 rounded-lg bg-trace-600 px-3 py-2 text-xs font-semibold text-white hover:bg-trace-700 sm:flex-none"
                    >
                      Same object
                    </button>
                    <button
                      onClick={() => handleDismiss(p.id)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:flex-none"
                    >
                      Keep separate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:w-64">
            <span className="text-slate-400">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search objects..."
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-40 sm:flex-none"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-44 sm:flex-none"
          >
            <option value="recent">Recently seen</option>
            <option value="confidence">Highest confidence</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Showing <span className="font-semibold text-ink">{filtered.length}</span> objects
        </p>

        {loading && <p className="text-sm text-slate-400">Loading...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="text-sm text-slate-500">No objects match your filters yet.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((obj) => (
            <ObjectCard key={obj.id} obj={obj} />
          ))}
        </div>
      </main>
    </>
  );
}