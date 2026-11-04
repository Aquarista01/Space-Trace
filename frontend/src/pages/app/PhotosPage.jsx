import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Topbar from "@/components/layout/Topbar";
import { googleLoginUrl } from "@/lib/api";
import {
  createPickerSession,
  deleteMyData,
  disconnectGoogle,
  getIndexJob,
  getPickerSession,
  getSummary,
  getSupportedClasses,
  startImport,
  uploadPhoto,
} from "@/lib/photosApi";

const STEPS = ["Choose photos", "Confirm selection", "Import & index"];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function Stepper({ current }) {
  return (
    <ol className="flex flex-wrap gap-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm ${
              active
                ? "border-trace-600 bg-trace-600 font-semibold text-white"
                : done
                  ? "border-trace-600 text-trace-700"
                  : "border-slate-200 text-slate-400"
            }`}
          >
            <span>{done ? "✓" : i + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export default function PhotosPage() {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [session, setSession] = useState(null);
  const [pickerUrl, setPickerUrl] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState(null);
  const [showClasses, setShowClasses] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await getSummary());
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    if (session?.status !== "created") return;
    const timer = setInterval(async () => {
      try {
        setSession(await getPickerSession(session.id));
      } catch (e) {
        setError(e.message);
        toast.error(e.message || "Could not check your photo selection.");
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (job?.status !== "running") return;
    const timer = setInterval(async () => {
      try {
        const next = await getIndexJob(job.id);
        setJob(next);
        if (next.status !== "running") {
          refreshSummary();
          if (next.failed > 0) {
            toast.error(`${next.failed} of ${next.total} photo(s) could not be imported.`);
          } else {
            toast.success(`${next.processed} photo(s) imported successfully.`);
          }
        }
      } catch (e) {
        setError(e.message);
        toast.error(e.message || "Could not check import progress.");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, refreshSummary]);

  const reset = () => {
    setSession(null);
    setPickerUrl(null);
    setJob(null);
    setError("");
  };

  const handleConnect = async () => {
    if (!summary?.connected) {
      window.location.href = `${googleLoginUrl}?next=/dashboard/photos`;
      return;
    }

    setError("");
    setBusy(true);
    const popup = window.open("", "_blank");
    try {
      const created = await createPickerSession();
      const uri = created.picker_uri ?? created.pickerUri;
      const url = `${uri}/autoclose`;
      setSession(created);
      setPickerUrl(url);
      if (popup) popup.location.href = url;
    } catch (e) {
      popup?.close();
      const message = e.message || "Could not start Google Photos Picker.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setError("");
    setBusy(true);
    try {
      setJob(await startImport(session.id));
      toast.success("Import started");
    } catch (e) {
      const message = e.message || "Could not start the import.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    setConfirmingDelete(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      await uploadPhoto(file);
      await refreshSummary();
      toast.success("Photo uploaded and queued for indexing");
    } catch (err) {
      const message = err.message || "Could not upload the photo.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const toggleClasses = async () => {
    if (!classes) {
      try {
        setClasses(await getSupportedClasses());
      } catch (e) {
        setClasses({ classes: [], conditions: [] });
        toast.error(e.message || "Could not load the supported object list.");
      }
    }
    setShowClasses((v) => !v);
  };

  const confirmDisconnect = async () => {
    setConfirmingDisconnect(false);
    setBusy(true);
    try {
      await disconnectGoogle();
      reset();
      await refreshSummary();
      toast.success("Google Photos disconnected");
    } catch (e) {
      const message = e.message || "Could not disconnect Google Photos.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setConfirmingDelete(false);
    setBusy(true);
    try {
      await deleteMyData();
      reset();
      await refreshSummary();
      toast.success("All imported data deleted");
    } catch (e) {
      toast.error(e.message || "Could not delete your data.");
    } finally {
      setBusy(false);
    }
  };

  const jobFinished = job && job.status !== "running";
  let step = -1;
  if (session?.status === "created") step = 0;
  if (session?.status === "picked") step = 1;
  if (job) step = jobFinished ? 3 : 2;

  const processed = (job?.processed ?? 0) + (job?.failed ?? 0);
  const percent = job?.total ? Math.round((processed / job.total) * 100) : 0;
  const connected = summary?.connected;

  return (
    <>
      <Topbar title="Google Photos" description="Manage connected and indexed photos." />
      <main className="space-y-6 p-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h3 className="text-lg font-semibold text-ink">Google Photos Integration</h3>
              <p className="mt-2 text-sm text-slate-500">
                SpaceTrace uses Google Photos Picker so you can explicitly select which historical photos are
                available for indexing.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {loadingSummary ? "Checking…" : connected ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat value={summary?.imported ?? 0} label="Imported photos" />
            <Stat value={summary?.indexed ?? "—"} label="Indexed media" />
            <Stat value={formatDate(summary?.last_sync)} label="Last sync" />
          </div>

          {connected && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <button
                onClick={() => setConfirmingDisconnect(true)}
                disabled={busy}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Disconnect Google Photos
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-ink">Import photos</h3>
          <p className="mt-2 text-sm text-slate-500">
            Pick the photos you want to trace. Only the items you select are copied into SpaceTrace.
          </p>

          {step >= 0 && (
            <div className="mt-5">
              <Stepper current={step} />
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6">
            {step === -1 && (
              <button
                onClick={handleConnect}
                disabled={busy}
                className="rounded-xl bg-trace-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700 disabled:opacity-60"
              >
                {busy ? "Opening Google Photos…" : connected ? "Choose photos" : "Connect Google Photos"}
              </button>
            )}

            {step === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                <p>Waiting for you to finish selecting photos in the Google Photos tab…</p>
                <div className="mt-3 flex gap-4">
                  <a
                    href={pickerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-trace-700 hover:underline"
                  >
                    Reopen Google Photos
                  </a>
                  <button onClick={reset} className="text-slate-500 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm text-slate-600">Your selection is ready.</p>
                <button
                  onClick={handleImport}
                  disabled={busy}
                  className="rounded-xl bg-trace-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trace-700 disabled:opacity-60"
                >
                  {busy ? "Starting…" : "Import selected photos"}
                </button>
                <button onClick={reset} className="text-sm text-slate-500 hover:underline">
                  Choose again
                </button>
              </div>
            )}

            {step >= 2 && job && (
              <div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>
                    {jobFinished ? "Import finished" : "Importing photos…"} {processed} / {job.total || "?"}
                  </span>
                  <span>{percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-trace-600 transition-all"
                    style={{ width: `${jobFinished ? 100 : percent}%` }}
                  />
                </div>
                {job.failed > 0 && (
                  <p className="mt-2 text-sm text-red-600">{job.failed} photo(s) could not be imported.</p>
                )}
                {jobFinished && (
                  <button
                    onClick={reset}
                    className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
                  >
                    Import more photos
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-sm font-medium text-ink">Or upload from your device</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload a photo directly — it goes through the same indexing pipeline as Google Photos.
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50">
              {uploading ? "Uploading…" : "Choose a photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink">Supported object types</h3>
              <p className="mt-2 text-sm text-slate-500">
                Detection works best for common household and everyday items. See the full list
                and conditions that may affect accuracy.
              </p>
            </div>
            <button
              onClick={toggleClasses}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              {showClasses ? "Hide" : "View list"}
            </button>
          </div>

          {showClasses && classes && (
            <div className="mt-5">
              <div className="flex flex-wrap gap-2">
                {classes.classes.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-500">
                {classes.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-ink">Delete my data</h3>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Removes every imported photo and its index from SpaceTrace. Photos in your Google Photos library are
            never changed.
          </p>
          <button
            onClick={handleDelete}
            disabled={busy || !summary?.imported}
            className="mt-5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete imported data
          </button>
        </section>

        <ConfirmDialog
          open={confirmingDelete}
          title="Delete all imported photos?"
          description="This removes every imported photo and its index from SpaceTrace. Your photos in Google Photos are never changed."
          confirmLabel="Delete everything"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
        <ConfirmDialog
          open={confirmingDisconnect}
          title="Disconnect Google Photos?"
          description="SpaceTrace will no longer be able to import new photos from Google Photos until you reconnect. Already-imported photos and their index are not affected."
          confirmLabel="Disconnect"
          danger
          onConfirm={confirmDisconnect}
          onCancel={() => setConfirmingDisconnect(false)}
        />
      </main>
    </>
  );
}