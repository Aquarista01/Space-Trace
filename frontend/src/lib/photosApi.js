
const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include", // gửi cookie đăng nhập kèm request
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* body không phải JSON */
    }
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
export const uploadPhoto = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/photos/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Upload failed");
  }
  return res.json();
};
export const disconnectGoogle = () => request("/photos/disconnect", { method: "POST" });
export const getSupportedClasses = () => request("/photos/supported-classes");
export const retryMedia = (id) => request(`/photos/media/${id}/retry`, { method: "POST" });
export const deleteMedia = (id) => request(`/photos/media/${id}`, { method: "DELETE" });
export const updateMediaCapturedAt = (id, takenAt) =>
  request(`/photos/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ taken_at: takenAt }),
  });


// Thống kê + trạng thái kết nối (cần endpoint GET /photos/summary ở backend)
export const getSummary = () => request("/photos/summary");

// Picker flow
export const createPickerSession = () => request("/photos/picker-sessions", { method: "POST" });
export const getPickerSession = (id) => request(`/photos/picker-sessions/${id}`);
export const startImport = (id) => request(`/photos/picker-sessions/${id}/import`, { method: "POST" });
export const getIndexJob = (id) => request(`/photos/index-jobs/${id}`);

// FR-12: xóa dữ liệu index của người dùng (cần endpoint DELETE /photos/data ở backend)
export const deleteMyData = () => request("/photos/data", { method: "DELETE" });