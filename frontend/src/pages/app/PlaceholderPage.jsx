import Topbar from "@/components/layout/Topbar";

export default function PlaceholderPage({ title, description }) {
  return (
    <>
      <Topbar title={title} description={description} />
      <main className="p-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <p className="text-sm text-slate-500">This feature is coming soon.</p>
        </div>
      </main>
    </>
  );
}