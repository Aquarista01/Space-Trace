import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import { listObjects } from "@/lib/objects";
import { getSpaces, getLatestDiff } from "@/lib/spacesApi";
import { getSummary } from "@/lib/photosApi";
import { objectIcon, displayName, formatConfidence, formatDate } from "@/lib/objectDisplay";
import { spaceIcon, formatDateTime } from "@/lib/spaceDisplay";
import { usePreferences } from "@/context/PreferencesContext";
import { filterObjectsByRecognition } from "@/lib/recognition";

const CHANGE_META = {
  appeared: { symbol: "+", label: "Appeared", color: "text-emerald-600", bg: "bg-emerald-50" },
  disappeared: { symbol: "−", label: "Not detected", color: "text-rose-600", bg: "bg-rose-50" },
  moved: { symbol: "~", label: "Moved", color: "text-amber-600", bg: "bg-amber-50" },
};

function SectionHeader({ title, description, to, linkLabel }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {to && (
        <Link
          to={to}
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-trace-600 hover:text-trace-700"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function StatCard({ label, value, caption }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink sm:mt-3 sm:text-3xl">{value}</p>
      {caption && <p className="mt-1 text-xs font-medium text-emerald-600">{caption}</p>}
    </div>
  );
}

function ObjectCard({ obj }) {
  const seen = obj.last_seen;
  return (
    <Link
      to={`/dashboard/objects/${obj.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xl">
          {seen?.image_url ? (
            <img src={seen.image_url} alt="" className="h-full w-full object-cover" />
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
      <p className="mt-1 truncate text-sm text-slate-500">{seen?.space_name ?? "Unassigned space"}</p>

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

export default function OverviewPage() {
  const [objects, setObjects] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [summary, setSummary] = useState(null);
  const [spaceChanges, setSpaceChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
const { recognition } = usePreferences();
const visibleObjects = filterObjectsByRecognition(objects, recognition);
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [objectsData, spacesData, summaryData] = await Promise.all([
          listObjects(),
          getSpaces(),
          getSummary(),
        ]);
        if (!active) return;

        setObjects(objectsData);
        setSpaces(spacesData);
        setSummary(summaryData);

        const changedSpaces = spacesData
          .filter((s) => s.recent_changes > 0)
          .sort((a, b) => new Date(b.last_updated ?? 0) - new Date(a.last_updated ?? 0))
          .slice(0, 3);

        const diffResults = await Promise.all(
          changedSpaces.map((s) =>
            getLatestDiff(s.id)
              .then((diff) => ({ space: s, diff }))
              .catch(() => null)
          )
        );

        if (!active) return;

        const flattened = diffResults
          .filter(Boolean)
          .flatMap(({ space, diff }) =>
            diff.items
              .filter((item) => item.change_type !== "unchanged")
              .map((item) => ({
                ...item,
                spaceName: space.name ?? "Unnamed space",
                time: space.last_updated,
              }))
          )
          .slice(0, 5);

        setSpaceChanges(flattened);
      } catch (e) {
        if (active) setError(e.message || "Could not load overview data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const query = search.trim().toLowerCase();

  const searchResults = query
    ? visibleObjects.filter((o) =>
        [displayName(o), o.label, o.last_seen?.space_name]
          .filter(Boolean)
          .some((text) => String(text).toLowerCase().includes(query))
      )
    : [];

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const recentObjects = [...visibleObjects]
    .filter((o) => o.last_seen)
    .sort((a, b) => new Date(b.last_seen.observed_at) - new Date(a.last_seen.observed_at))
    .slice(0, 4);

  const topSpaces = [...spaces]
    .sort((a, b) => new Date(b.last_updated ?? 0) - new Date(a.last_updated ?? 0))
    .slice(0, 2);

  const activeSpaces = spaces.filter((s) => s.scene_count > 0).length;
  const objectsWithSightings = visibleObjects.filter((o) => o.last_seen).length;
  const totalChanges = spaces.reduce((sum, s) => sum + (s.recent_changes ?? 0), 0);
  const spacesWithChanges = spaces.filter((s) => s.recent_changes > 0).length;

  return (
    <>
      <Topbar title="Dashboard" description="Your visual memory at a glance." />

      <main className="p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-2xl bg-ink px-5 py-8 text-white sm:rounded-3xl sm:px-8 sm:py-10 lg:px-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-trace-600/30 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-trace-100">
              AI-powered visual memory
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:mt-5 sm:text-4xl">
              Find what you lost.
              <span className="block text-trace-400">See what changed.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-4">
              Search across your indexed visual history to find where an object was last
              observed or inspect changes in your spaces.
            </p>

            <form onSubmit={handleSearch} className="mt-5 flex max-w-xl overflow-hidden rounded-2xl bg-white sm:mt-6">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search headphones, backpack..."
                className="min-w-0 flex-1 px-4 py-3.5 text-sm text-ink outline-none placeholder:text-slate-400 sm:px-5 sm:py-4"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="px-3 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 px-5 py-3.5 text-sm font-semibold text-white sm:px-6 sm:py-4"
                style={{ backgroundColor: "#0E7C7B" }}
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {query && (
          <section className="mt-6 sm:mt-7">
            <SectionHeader
              title="Search results"
              description={
                loading
                  ? "Searching..."
                  : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for “${search.trim()}”`
              }
              to={
                searchResults.length > 0
                  ? `/dashboard/objects?q=${encodeURIComponent(search.trim())}`
                  : undefined
              }
              linkLabel="Open in Objects →"
            />

            {!loading && searchResults.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center sm:p-10">
                <p className="text-sm text-slate-500">No objects match your search.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {searchResults.slice(0, 8).map((obj) => (
                  <ObjectCard key={obj.id} obj={obj} />
                ))}
              </div>
            )}
          </section>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:mt-7 sm:gap-5 xl:grid-cols-4">
          <StatCard
            label="Indexed Photos"
            value={summary?.imported ?? 0}
            caption={summary ? `${summary.indexed} indexed` : undefined}
          />
          <StatCard
            label="Tracked Objects"
            value={visibleObjects.length}
            caption={`${objectsWithSightings} recently seen`}
          />
          <StatCard label="Spaces" value={spaces.length} caption={`${activeSpaces} active spaces`} />
          <StatCard
            label="Detected Changes"
            value={totalChanges}
            caption={`${spacesWithChanges} space${spacesWithChanges === 1 ? "" : "s"} affected`}
          />
        </section>

        <section className="mt-8 sm:mt-10">
          <SectionHeader
            title="Recently Seen Objects"
            description="Latest observations from your visual history"
            to="/dashboard/objects"
            linkLabel="View all →"
          />

          {!loading && recentObjects.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center sm:p-10">
              <p className="text-sm text-slate-500">No objects tracked yet.</p>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recentObjects.map((obj) => (
              <ObjectCard key={obj.id} obj={obj} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-8 sm:mt-10 xl:grid-cols-5 xl:gap-6">
          <div className="min-w-0 xl:col-span-3">
            <SectionHeader
              title="Recent Space Changes"
              description="Physical changes detected across your spaces"
            />

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {spaceChanges.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">
                  No changes detected yet. Compare scenes inside a space to see results here.
                </p>
              )}

              {spaceChanges.map((item, i) => {
                const meta = CHANGE_META[item.change_type] ?? CHANGE_META.moved;
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-3 p-4 sm:p-5 ${
                      i !== spaceChanges.length - 1 ? "border-b border-slate-100" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-bold sm:h-11 sm:w-11 ${meta.bg} ${meta.color}`}
                      >
                        {meta.symbol}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">
                          {item.object_label ?? "Unknown object"}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="max-w-[40%] shrink-0 text-right">
                      <p className="truncate text-sm font-medium text-slate-600">{item.spaceName}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.time)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 xl:col-span-2">
            <SectionHeader
              title="My Spaces"
              description="Frequently indexed locations"
              to="/dashboard/spaces"
              linkLabel="View all →"
            />

            <div className="mt-5 grid gap-4">
              {topSpaces.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center sm:p-10">
                  <p className="text-sm text-slate-500">No spaces identified yet.</p>
                </div>
              )}

              {topSpaces.map((space) => (
                <Link
                  key={space.id}
                  to={`/dashboard/spaces/${space.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md sm:p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xl">
                    {space.cover_url ? (
                      <img src={space.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      spaceIcon(space.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-ink">{space.name ?? "Unnamed space"}</p>
                      {space.recent_changes > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {space.recent_changes} change{space.recent_changes === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{space.scene_count} indexed scenes</p>
                    <p className="mt-2 truncate text-xs text-slate-400">
                      Last updated · {formatDateTime(space.last_updated)}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-base text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-trace-100 bg-trace-50 p-5 sm:mt-10 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-trace-700">Google Photos</p>
              <h3 className="mt-1 text-lg font-bold text-ink">
                {summary?.connected
                  ? "Your visual index is up to date"
                  : "Connect Google Photos to get started"}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {summary
                  ? `${summary.imported} selected photo${summary.imported === 1 ? "" : "s"} currently indexed by SpaceTrace.`
                  : "Loading..."}
              </p>
            </div>

            <Link
              to="/dashboard/photos"
              className="whitespace-nowrap rounded-xl bg-trace-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-trace-700"
            >
              {summary?.connected ? "Import more photos" : "Connect Google Photos"}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}