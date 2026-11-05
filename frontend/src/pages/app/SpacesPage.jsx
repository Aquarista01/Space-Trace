import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import { getSpaces } from "@/lib/spacesApi";
import { spaceIcon, formatDateTime } from "@/lib/spaceDisplay";

function SpaceCard({ space }) {
  const changes = space.recent_changes ?? 0;

  return (
    <Link
      to={`/dashboard/spaces/${space.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl">
          {space.cover_url ? (
            <img src={space.cover_url} alt={space.name ?? "Space"} className="h-full w-full object-cover" />
          ) : (
            spaceIcon(space.name)
          )}
        </div>

        {changes > 0 && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {changes} change{changes === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <p className="mt-4 truncate text-base font-semibold text-ink">{space.name ?? "Unnamed space"}</p>
      <p className="mt-1 truncate text-sm text-slate-500">{space.scene_count} indexed scenes</p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Last updated</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">{formatDateTime(space.last_updated)}</p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-base text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getSpaces()
      .then(setSpaces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return spaces;
    return spaces.filter((space) => (space.name ?? "unnamed space").toLowerCase().includes(text));
  }, [spaces, search]);

  return (
    <>
      <Topbar title="My Space" description="Recurring physical spaces identified from your photos." />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Space Library</h3>
            <p className="mt-1 text-sm text-slate-500">
              {spaces.length} recurring space{spaces.length === 1 ? "" : "s"} identified.
            </p>
          </div>
          <Link
            to="/dashboard/photos"
            className="inline-flex items-center justify-center rounded-xl bg-trace-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700"
          >
            + Add Space
          </Link>
        </div>

        <div className="mb-5 flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:w-64">
          <span className="text-slate-400">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spaces..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {loading && <p className="text-sm text-slate-400">Loading...</p>}

        {!loading && spaces.length > 0 && (
          <p className="mb-4 text-sm text-slate-500">
            Showing <span className="font-semibold text-ink">{filtered.length}</span> spaces
          </p>
        )}

        {!loading && spaces.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="text-sm text-slate-500">No spaces identified yet. Import more photos to get started.</p>
          </div>
        )}

        {!loading && spaces.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="text-sm text-slate-500">No spaces match "{search}".</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      </main>
    </>
  );
}