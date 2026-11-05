import { createPortal } from "react-dom";

export default function ImageViewerDialog({ open, src, title, subtitle, onClose }) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow transition hover:bg-white"
        >
          ✕
        </button>

        <img src={src} alt={title ?? ""} className="max-h-[70vh] w-full bg-slate-50 object-contain" />

        {(title || subtitle) && (
          <div className="border-t border-slate-100 p-4">
            {title && <p className="font-semibold text-ink">{title}</p>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}