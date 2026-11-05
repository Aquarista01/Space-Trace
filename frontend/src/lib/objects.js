const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
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
    }
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
export const listPendingMatches = () => request("/objects/pending-review");
export const confirmMatch = (id) => request(`/objects/${id}/confirm-match`, { method: "POST" });
export const dismissMatch = (id) => request(`/objects/${id}/dismiss-match`, { method: "POST" });
export const listObjects = () => request("/objects");
export const getObject = (id) => request(`/objects/${id}`);
export const getObjectHistory = (id) => request(`/objects/${id}/history`);
export const updateObject = (id, payload) =>
  request(`/objects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const mergeObjects = (targetId, sourceId) =>
  request(`/objects/${targetId}/merge`, {
    method: "POST",
    body: JSON.stringify({ source_id: sourceId }),
  });