import AuthCta from "@/components/common/AuthCta";
import "./HomePage.css";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trace-600 text-lg font-bold text-white">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">SpaceTrace</h1>
              <p className="text-xs text-slate-500">Visual Memory & Space Tracking</p>
            </div>
          </div>

          <AuthCta
  label="Open Dashboard"
  className="rounded-xl bg-trace-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700"
/>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex rounded-full bg-trace-50 px-4 py-2 text-sm font-medium text-trace-700">
            AI-powered visual memory
          </div>

          <h2 className="text-5xl font-bold tracking-tight text-ink md:text-6xl">
            Find what you lost.
            <span className="block text-trace-600">See what changed.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            SpaceTrace builds a visual history of your objects and spaces so
            you can discover where an item was last observed and understand
            how your surroundings changed over time.
          </p>

          <div className="mt-9 flex justify-center gap-3">
           <AuthCta
  label="Explore"
  className="rounded-xl bg-trace-600 px-7 py-3.5 font-semibold text-white transition hover:bg-trace-700"
/>

            <a
              href="#features"
              className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Learn more
            </a>
          </div>
        </div>

        <div id="features" className="home-features mt-20 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon="◎"
            title="Last Seen"
            description="Find the most recent observation of a specific object and see where it appeared."
          />
          <FeatureCard
            icon="◫"
            title="Object History"
            description="Explore a timeline showing when and where the same object appeared over time."
          />
          <FeatureCard
            icon="⇄"
            title="Room Diff"
            description="Compare two versions of a space and detect objects that appeared, disappeared, or moved."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="home-feature-card rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-trace-50 text-2xl text-trace-600">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 leading-7 text-slate-600">{description}</p>
    </div>
  );
}