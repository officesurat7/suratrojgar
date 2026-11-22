export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
export const SESSION_COOKIE = "sr_session";
export const ROLE_COOKIE = "sr_role"; // non-sensitive hint used only for routing UX; the API enforces access
export const SITE_NAME = "SuratRojgar";
export const TAGLINE = "Surat's own job portal";
