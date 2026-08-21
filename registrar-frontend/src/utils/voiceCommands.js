// src/utils/voiceCommands.js
// -------------------------------------------------------
// Voice navigation command grammar.
//
// This module is the single source of truth for "what the user can say"
// and "what it means". It is intentionally decoupled from React/DOM:
//   - VOICE_COMMANDS  -> declarative phrase -> intent table
//   - matchCommand()  -> transcript -> matched intent (pure function)
//   - resolveVoiceRoute() -> (target, role) -> concrete route, using
//     ROLE_HOME (from AuthProvider) so the same spoken phrase
//     ("open dashboard") resolves to the correct path per role.
//
// To add a new voice command: add a phrase to an existing intent, or
// add a new intent object to VOICE_COMMANDS + a matching entry in
// ROLE_ROUTE_MAP for every role that should support it. No other file
// needs to change.
// -------------------------------------------------------

import { ROLES, ROLE_HOME } from "../context/AuthProvider";

/**
 * @typedef {"navigate" | "action"} VoiceCommandType
 *
 * @typedef {Object} VoiceCommandIntent
 * @property {string} id - Unique, stable identifier (useful for analytics/logging).
 * @property {VoiceCommandType} type - "navigate" to change routes, "action" for a side effect.
 * @property {string} [target] - Logical destination key (required when type === "navigate").
 *                                Resolved to an actual path via resolveVoiceRoute().
 * @property {string} [action] - Action name (required when type === "action"), e.g. "logout".
 * @property {string[]} phrases - Spoken phrases/keywords that trigger this intent.
 */

/** @type {VoiceCommandIntent[]} */
export const VOICE_COMMANDS = [
  {
    id: "navigate-dashboard",
    type: "navigate",
    target: "dashboard",
    phrases: [
      "go to dashboard", "open dashboard", "show dashboard", "dashboard",
      "go home", "go to home", "open home", "home page",
    ],
  },
  {
    id: "navigate-inbox",
    type: "navigate",
    target: "inbox",
    phrases: [
      "go to inbox", "open inbox", "show inbox", "inbox", "my messages",
    ],
  },
  {
    id: "navigate-lists",
    type: "navigate",
    target: "lists",
    phrases: [
      "document lists", "go to document lists", "open document lists",
      "show my documents", "view my documents", "my document list",
    ],
  },
  {
    id: "navigate-request",
    type: "navigate",
    target: "request",
    phrases: [
      "new request", "go to request", "open request", "make a request",
      "request a document", "document request", "walk in request", "walk-in request", 
      "request form", "request page", "request"
    ],
  },
  {
    id: "navigate-profile",
    type: "navigate",
    target: "profile",
    phrases: [
      "go to profile", "open profile", "show profile", "my profile", "view profile", "profile",
    ],
  },
  {
    id: "navigate-faqs",
    type: "navigate",
    target: "faqs",
    phrases: [
      "go to faqs", "open faqs", "faqs", "frequently asked questions",
      "help and support", "support page", "frequently asked", "help"
    ],
  },
  {
    id: "navigate-contact",
    type: "navigate",
    target: "contact",
    phrases: [
      "go to contact", "open contact", "contact registrar", "contact us",
    ],
  },
  {
    id: "navigate-analytics",
    type: "navigate",
    target: "analytics",
    phrases: [
      "go to analytics", "open analytics", "show analytics", "analytics",
    ],
  },
  {
    id: "navigate-logbook",
    type: "navigate",
    target: "logbook",
    phrases: [
      "go to logbook", "open logbook", "show logbook", "logbook",
    ],
  },
  {
    id: "navigate-users",
    type: "navigate",
    target: "users",
    phrases: [
      "go to user management", "open user management", "user management",
      "go to admin management", "open admin management", "admin management",
      "admin directory", "manage users", "manage accounts", "manage staff",
      "users", "accounts",
    ],
  },
  {
    id: "navigate-access-requests",
    type: "navigate",
    target: "access-requests",
    phrases: [
      "go to access requests", "open access requests", "access requests",
      "permission requests", "role requests", "request access",
    ],
  },
  {
    id: "navigate-business-calendar",
    type: "navigate",
    target: "business-calendar",
    phrases: [
      "go to business calendar", "open business calendar", "business calendar",
      "calendar management", "manage calendar", "holiday calendar",
      "academic calendar", "calendar",
    ],
  },
  {
    id: "navigate-access-control",
    type: "navigate",
    target: "access-control",
    phrases: [
      "switch role", "switch roles", "change role", "switch account",
      "access control", "role switcher", "choose role",
    ],
  },
  {
    id: "navigate-documents",
    type: "navigate",
    target: "documents",
    phrases: [
      "go to document management", "open document management",
      "document management", "manage documents",
    ],
  },
  {
    id: "navigate-certificates",
    type: "navigate",
    target: "certificates",
    phrases: [
      "go to certificates", "open certificate management", "certificate management",
      "certificate templates", "manage certificates", "cetificates", "certificates management",
    ],
  },
  {
    id: "navigate-reports",
    type: "navigate",
    target: "reports",
    phrases: [
      "go to audit trail", "open audit trail", "show audit trail", "audit trail",
      "audit logs", "go to audit logs", "open audit logs", "show audit logs",
      "view audit trail", "view audit logs", "audit log",
    ],
  },
  {
    id: "navigate-settings",
    type: "navigate",
    target: "settings",
    phrases: [
      "go to settings", "open settings", "system settings", "settings", 
    ],
  },
  {
    id: "action-logout",
    type: "action",
    action: "logout",
    phrases: ["log out", "logout", "sign out", "log me out"],
  },
  {
    id: "action-theme-dark",
    type: "action",
    action: "dark-mode",
    phrases: [
      "turn on dark mode", "dark mode", "enable dark mode", "activate dark mode",
      "switch to dark mode", "turn dark mode on", "go dark",
    ],
  },
  {
    id: "action-theme-light",
    type: "action",
    action: "light-mode",
    phrases: [
      "turn on light mode", "light mode", "enable light mode", "activate light mode",
      "switch to light mode", "turn light mode on", 
    ],
  },
  {
    id: "action-theme-toggle",
    type: "action",
    action: "toggle-theme",
    phrases: [
      "toggle theme", "toggle dark mode", "change theme", "switch theme",
    ],
  },
  {
    id: "action-export-docx",
    type: "action",
    action: "export-docx",
    phrases: [
      "export docx", "export document", "export documents", "export logbook",
      "export report", "export file", "download logbook", "download report",
      "export logbook document", "export logbook report", "download docx",
    ],
  },
  {
    id: "action-compose-email",
    type: "action",
    action: "compose-email",
    phrases: [
      "compose email", "send email", "email registrar", "compose mail",
      "send mail", "open email", "email support", "contact registrar email",
      "compose email to registrar",
    ],
  },
];

// -------------------------------------------------------
// Role-aware route resolution
// -------------------------------------------------------
// Maps a logical `target` (spoken-intent) to the relative sub-path used
// under that role's ROLE_HOME prefix, mirroring the routes registered in
// App.jsx. An omitted target means that section doesn't exist for the role
// (e.g. Super Admin has no "profile" route, Staff has no "lists" route).
const ROLE_ROUTE_MAP = {
  [ROLES.STUDENT]: {
    dashboard: "home",
    inbox: "inbox",
    lists: "lists",
    request: "request",
    profile: "profile",
    faqs: "faqs",
    contact: "contact",
  },
  [ROLES.ALUMNI]: {
    dashboard: "home",
    inbox: "inbox",
    lists: "lists",
    request: "request",
    profile: "profile",
    faqs: "faqs",
    contact: "contact",
  },
  [ROLES.ADMIN]: {
    dashboard: "dashboard",
    inbox: "inbox",
    request: "request",
    analytics: "analytics",
    logbook: "logbook",
    profile: "profile",
    contact: "contact",
    "access-requests": "access-requests",
    "business-calendar": "business-calendar",
  },
  [ROLES.SUPER_ADMIN]: {
    dashboard: "user",
    inbox: "inbox",
    users: "user",
    documents: "documents",
    certificates: "documents",
    reports: "report",
    settings: "settings",
    contact: "contact",
    "business-calendar": "business-calendar",
  },
};

/**
 * Resolve a logical navigation target into a concrete, role-scoped route.
 *
 * @param {string} target - Logical destination key, e.g. "dashboard", "logbook".
 * @param {string|undefined|null} roleName - The current user's role_name.
 * @returns {string|null} A full path (e.g. "/staff/logbook"), or null if this
 *                         target doesn't exist for the given role.
 */
export function resolveVoiceRoute(target, roleName) {
  if (target === "access-control") {
    return "/access-control";
  }

  const base = ROLE_HOME[roleName];
  const routesForRole = ROLE_ROUTE_MAP[roleName];
  if (!base || !routesForRole || !(target in routesForRole)) return null;

  const subPath = routesForRole[target];
  return subPath ? `${base}/${subPath}` : base;
}

// -------------------------------------------------------
// Transcript matching
// -------------------------------------------------------

/**
 * Normalize raw speech-to-text output for reliable matching:
 * lowercase, strip punctuation, collapse whitespace.
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a spoken transcript against the voice command grammar.
 *
 * Matching is phrase-based (word-boundary substring), so users don't need
 * to speak the exact wording — "can you open the dashboard please" still
 * matches the "open dashboard" phrase. When multiple phrases match, the
 * longest (most specific) one wins, e.g. "go to document lists" is
 * preferred over a looser, shorter overlapping phrase.
 *
 * @param {string} transcript - Raw transcript from useVoiceRecognition.
 * @returns {VoiceCommandIntent|null} The matched intent, or null if nothing matched.
 */
export function matchCommand(transcript) {
  if (!transcript || typeof transcript !== "string") return null;

  const normalized = normalize(transcript);
  if (!normalized) return null;

  let best = null;
  let bestPhraseLength = -1;

  for (const command of VOICE_COMMANDS) {
    for (const phrase of command.phrases) {
      const normalizedPhrase = normalize(phrase);
      const pattern = new RegExp(`\\b${escapeRegExp(normalizedPhrase)}\\b`);

      if (pattern.test(normalized) && normalizedPhrase.length > bestPhraseLength) {
        best = command;
        bestPhraseLength = normalizedPhrase.length;
      }
    }
  }

  return best;
}
