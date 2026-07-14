function apiUrl() {
  return (typeof window !== "undefined" && window.__MEMORYNODE_CONFIG__?.apiOrigin || "http://127.0.0.1:8000").replace(/\/$/, "");
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      detail = (await response.text()) || detail;
    }
    throw new Error(detail);
  }

  return response.json();
}

export function extractProposals({ actorId, projectId, transcript }) {
  return request("/v1/proposals/extract", {
    method: "POST",
    body: JSON.stringify({
      actor_id: actorId,
      project_id: projectId,
      messages: [{ role: "user", content: transcript }],
    }),
  });
}

export function listProposals(status = "pending") {
  return request(`/v1/proposals?status=${encodeURIComponent(status)}`);
}

export function approveProposal(id, actorId = "reviewer", supersedeMemoryId = null, expiresAt = null) {
  return request(`/v1/proposals/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({
      actor_id: actorId,
      supersede_memory_id: supersedeMemoryId,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    }),
  });
}

export function relatedMemories(id) {
  return request(`/v1/proposals/${encodeURIComponent(id)}/related-memories`);
}

export function rejectProposal(id, actorId = "reviewer") {
  return request(`/v1/proposals/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify({ actor_id: actorId }),
  });
}

export function searchMemories(q) {
  return request(`/v1/memories/search?q=${encodeURIComponent(q)}`);
}

export function explainMemory(id) {
  return request(`/v1/memories/${encodeURIComponent(id)}/explain`);
}

export function revokeMemory(id, actorId = "reviewer") {
  return request(`/v1/memories/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    body: JSON.stringify({ actor_id: actorId }),
  });
}
