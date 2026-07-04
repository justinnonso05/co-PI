// src/lib/endpoints.ts
// ─────────────────────────────────────────────────────────────────
// Single source of truth for all API endpoint paths.
// Import from this file on every page — never hardcode URLs.
// ─────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Authentication ────────────────────────────────────────────────
export const AUTH = {
  LOGIN:    `${BASE}/api/auth/login`,
  REGISTER: `${BASE}/api/auth/register`,
} as const;

// ── Users ─────────────────────────────────────────────────────────
export const USERS = {
  SEARCH: (query: string) => `${BASE}/api/users?q=${encodeURIComponent(query)}`,
  PROFILE: `${BASE}/api/users/profile`,
} as const;

// ── Activities ────────────────────────────────────────────────────
export const ACTIVITIES = {
  RECENT: `${BASE}/api/activities`,
} as const;

// ── Projects ──────────────────────────────────────────────────────
export const PROJECTS = {
  LIST:          `${BASE}/api/repositories`,
  CREATE:        `${BASE}/api/repositories`,
  DETAIL:        (id: string) => `${BASE}/api/repositories/${id}`,

  ADD_MEMBER:    (id: string) => `${BASE}/api/repositories/${id}/members`,
  REMOVE_MEMBER: (id: string, userId: string) => `${BASE}/api/repositories/${id}/members/${userId}`,
  UPDATE_STATUS: (id: string) => `${BASE}/api/repositories/${id}/status`,
  UPDATE_VISIBILITY: (id: string) => `${BASE}/api/repositories/${id}/visibility`,
  
  // Proposal Editor AI Endpoints
  PROPOSAL_AI_DRAFT: `${BASE}/api/ai/proposal/draft`,
};

export const PROPOSAL = {
  DRAFT:  (id: string) => `${BASE}/api/repositories/${id}/proposal`,
  SUBMIT: (id: string) => `${BASE}/api/repositories/${id}/proposal/submit`,
  REVIEW: (id: string) => `${BASE}/api/repositories/${id}/proposal/review`,
};

export const APPLICATIONS = {
  LIST:   (projectId: string) => `${BASE}/api/repositories/${projectId}/applications`,
  CREATE: (projectId: string) => `${BASE}/api/repositories/${projectId}/applications`,
  UPDATE: (id: string) => `${BASE}/api/applications/${id}`,
};

// ── Discovery ─────────────────────────────────────────────────────
export const DISCOVERY = {
  SEARCH_COUNT: (query: string) => `${BASE}/api/discover/search/count?q=${encodeURIComponent(query)}`,
  UNIVERSITY: `${BASE}/api/discover/university`,
  APPLY: (id: string) => `${BASE}/api/discover/apply/${id}`,
} as const;

// ── Tasks ─────────────────────────────────────────────────────────
export const TASKS = {
  // Uses top-level tasks route for some ops, but project context for listing
  LIST:   (projectId: string) => `${BASE}/api/repositories/${projectId}/tasks`,
  CREATE: (projectId: string) => `${BASE}/api/repositories/${projectId}/tasks`,
  UPDATE: (taskId: string) => `${BASE}/api/tasks/${taskId}`,
  DELETE: (taskId: string) => `${BASE}/api/tasks/${taskId}`,
};

// ── Documents ─────────────────────────────────────────────────────
export const DOCUMENTS = {
  LIST:   (projectId: string)                    => `${BASE}/api/repositories/${projectId}/documents`,
  CREATE: (projectId: string)                    => `${BASE}/api/repositories/${projectId}/documents`,
  DETAIL: (docId: string)                        => `${BASE}/api/documents/${docId}`,
  SAVE:   (docId: string)                        => `${BASE}/api/documents/${docId}`,
  AI_DRAFT: (docId: string)                      => `${BASE}/api/ai/documents/${docId}/draft`,
  AI_REVIEW: (docId: string)                     => `${BASE}/api/ai/documents/${docId}/review`,
};

// ── Surveys ───────────────────────────────────────────────────────
export const SURVEYS = {
  LIST:             (projectId: string) => `${BASE}/api/repositories/${projectId}/surveys`,
  CREATE:           (projectId: string) => `${BASE}/api/repositories/${projectId}/surveys`,
  DETAIL:           (surveyId: string)  => `${BASE}/api/surveys/${surveyId}`,
  RECORD_RESPONSE:  (surveyId: string)  => `${BASE}/api/surveys/${surveyId}/responses`,
  // Next-gen: generate full survey from text
  AI_GENERATE:      `${BASE}/api/ai/surveys/generate`,
};

// ── Outputs ───────────────────────────────────────────────────────
export const OUTPUTS = {
  LIST:   (projectId: string) => `${BASE}/api/repositories/${projectId}/outputs`,
  CREATE: (projectId: string) => `${BASE}/api/repositories/${projectId}/outputs`,
} as const;

// ── File Upload ───────────────────────────────────────────────────
export const UPLOAD = {
  FILE: `${BASE}/api/upload`,
} as const;

// ── Health ────────────────────────────────────────────────────────
export const HEALTH = `${BASE}/api/health`;
