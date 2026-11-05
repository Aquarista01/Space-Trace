import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { listObjects } from "@/lib/objects";
import { CATEGORY_LABELS } from "@/lib/objectDisplay";
import { usePreferences } from "@/context/PreferencesContext";
import { filterObjectsByRecognition } from "@/lib/recognition";

const THEMES = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "system", label: "System", icon: "◐" },
];

const LIGHT = { bg: "#F1F5F9", card: "#FFFFFF", line: "#CBD5E1" };
const DARK = { bg: "#0A0F1C", card: "#121A2B", line: "#34425F" };

function Section({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ThemePreview({ variant }) {
  const half = (p) => (
    <div className="flex-1 space-y-1.5 p-2" style={{ backgroundColor: p.bg }}>
      <div className="h-2.5 w-3/4 rounded" style={{ backgroundColor: p.card }} />
      <div className="h-2.5 w-1/2 rounded" style={{ backgroundColor: p.line }} />
    </div>
  );

  return (
    <div className="flex h-16 overflow-hidden rounded-lg border border-slate-200">
      {variant === "light" && half(LIGHT)}
      {variant === "dark" && half(DARK)}
      {variant === "system" && (
        <>
          {half(LIGHT)}
          {half(DARK)}
        </>
      )}
    </div>
  );
}

function SliderField({ label, hint, value, min, max, step = 5, onChange, valueLabel }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="shrink-0 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-indigo-700">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-indigo-600"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, recognition, updateRecognition, resetRecognition } = usePreferences();
  const [objects, setObjects] = useState([]);

  useEffect(() => {
    listObjects()
      .then(setObjects)
      .catch(() => setObjects([]));
  }, []);

  const categoryOptions = useMemo(
    () => Object.entries(CATEGORY_LABELS).filter(([value]) => value !== "all"),
    []
  );

  const visibleCount = useMemo(
    () => filterObjectsByRecognition(objects, recognition).length,
    [objects, recognition]
  );

  function toggleCategory(value) {
    const next = recognition.categories.includes(value)
      ? recognition.categories.filter((c) => c !== value)
      : [...recognition.categories, value];
    updateRecognition({ categories: next });
  }

  return (
    <>
      <Topbar title="Settings" description="Customize appearance and how SpaceTrace recognizes objects." />

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Section title="Appearance" description="Choose how SpaceTrace looks on this device.">
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map((t) => {
                const active = theme === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    aria-pressed={active}
                    className={`rounded-xl border p-2.5 text-left transition sm:p-3 ${
                      active
                        ? "border-indigo-500 bg-[#EEF2FF]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <ThemePreview variant={t.value} />
                    <div className="mt-2.5 flex items-center justify-between gap-1">
                      <span className={`text-sm font-medium ${active ? "text-indigo-700" : "text-ink"}`}>
                        {t.icon} {t.label}
                      </span>
                      {active && <span className="text-xs font-bold text-indigo-700">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {theme === "system" && (
              <p className="mt-3 text-sm text-slate-500">Follows your device's light or dark setting.</p>
            )}
          </Section>

          <Section
            title="Recognition"
            description="Control which objects and duplicate suggestions you see."
            action={
              <button
                type="button"
                onClick={resetRecognition}
                className="self-start rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
              >
                Reset to defaults
              </button>
            }
          >
            <div className="space-y-7">
              <SliderField
                label="Minimum confidence"
                hint={
                  recognition.minConfidence === 0
                    ? "Showing every object, no matter how confident the match is."
                    : `Objects whose latest match is below ${recognition.minConfidence}% are hidden.`
                }
                value={recognition.minConfidence}
                min={0}
                max={95}
                onChange={(v) => updateRecognition({ minConfidence: v })}
                valueLabel={recognition.minConfidence === 0 ? "Off" : `${recognition.minConfidence}%`}
              />

              <SliderField
                label="Duplicate sensitivity"
                hint={`Only suggest merging objects that are at least ${recognition.duplicateThreshold}% similar. Higher means fewer, more certain suggestions.`}
                value={recognition.duplicateThreshold}
                min={50}
                max={99}
                step={1}
                onChange={(v) => updateRecognition({ duplicateThreshold: v })}
                valueLabel={`${recognition.duplicateThreshold}%`}
              />

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">Tracked categories</p>
                  {recognition.categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateRecognition({ categories: [] })}
                      className="text-xs font-semibold text-trace-600 hover:text-trace-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryOptions.map(([value, label]) => {
                    const active = recognition.categories.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleCategory(value)}
                        aria-pressed={active}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                          active
                            ? "border-indigo-300 bg-[#EEF2FF] text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {active && "✓ "}
                        {label}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {recognition.categories.length === 0
                    ? "No category selected, so every category is tracked."
                    : `Only ${recognition.categories.length} categor${recognition.categories.length === 1 ? "y" : "ies"} will appear in your library.`}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-ink">{visibleCount}</span> of{" "}
              <span className="font-semibold text-ink">{objects.length}</span> objects match these settings.
            </div>
          </Section>
        </div>
      </main>
    </>
  );
}