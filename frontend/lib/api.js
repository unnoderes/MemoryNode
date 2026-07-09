const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
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

export function approveProposal(id, actorId = "reviewer") {
  return request(`/v1/proposals/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({ actor_id: actorId }),
  });
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
