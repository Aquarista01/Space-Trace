import { Link } from "react-router-dom";

export default function Topbar({ title, description }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold text-ink sm:text-xl">{title}</h2>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 sm:mt-1">{description}</p>
        )}
      </div>

      <Link
        to="/dashboard/photos"
        aria-label="Import Photos"
        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-trace-600 px-3 text-sm font-semibold text-white transition hover:bg-trace-700 sm:px-4"
      >
        <span className="text-lg leading-none">+</span>
        <span className="hidden sm:inline">Import Photos</span>
      </Link>
    </header>
  );
}