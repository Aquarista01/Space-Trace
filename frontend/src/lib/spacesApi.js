const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {}
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
export const mergeSpaces = (targetId, sourceId) =>
  request(`/spaces/${targetId}/merge`, {
    method: "POST",
    body: JSON.stringify({ source_id: sourceId }),
  });
export const getSpacesList = () => request("/spaces");
export const getSpaces = () => request("/spaces");
export const getSpace = (id) => request(`/spaces/${id}`);
export const updateSpace = (id, payload) =>
  request(`/spaces/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const getScenes = (spaceId) => request(`/spaces/${spaceId}/scenes`);
export const createDiff = (payload) =>
  request("/spaces/diffs", { method: "POST", body: JSON.stringify(payload) });
export const getDiff = (id) => request(`/spaces/diffs/${id}`);

export const getLatestDiff = (spaceId) => request(`/spaces/${spaceId}/diffs/latest`);