import { SUPABASE_URL, SUPABASE_ANON } from "./data.js";

const KEY = "ti.auth." + SUPABASE_URL;
let session = null;
let listeners = [];

try { session = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { session = null; }

function emit() { listeners.forEach((cb) => { try { cb(session); } catch {} }); }

function persist(s) {
  session = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
  emit();
}

function api(path, body, method = "POST") {
  return fetch(SUPABASE_URL + "/auth/v1/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      ...(session?.access_token ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  }).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw j;
    return j;
  });
}

function setFromTokenResponse(r) {
  if (!r || !r.access_token) return persist(null);
  persist({
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    user: r.user,
    expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
  });
}

async function doRefresh() {
  if (!session?.refresh_token) return null;
  try {
    const r = await api("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
    setFromTokenResponse(r);
    return session;
  } catch {
    persist(null);
    return null;
  }
}

async function refreshIfNeeded(force) {
  if (!session?.refresh_token) return session;
  const now = Math.floor(Date.now() / 1000);
  if (!force && session.expires_at && session.expires_at - now > 120) return session;
  return doRefresh();
}

// Background refresh so a long-open tab never carries a stale token.
setInterval(() => refreshIfNeeded(false), 60 * 1000);

export const auth = {
  getSession: () => session,
  onChange: (cb) => { listeners.push(cb); return () => { listeners = listeners.filter((x) => x !== cb); }; },
  getValidToken: async () => {
    const s = await refreshIfNeeded(false);
    return s ? s.access_token : null;
  },
  signInWithPassword: async (email, password) => {
    try {
      const r = await api("token?grant_type=password", { email, password });
      setFromTokenResponse(r);
      return {};
    } catch (e) {
      return { error: e.error_description || e.msg || e.message || "Sign-in failed" };
    }
  },
  signInWithMagicLink: async (email) => {
    try {
      await api("otp", { email, create_user: false, email_redirect_to: location.origin });
      return {};
    } catch (e) {
      return { error: e.error_description || e.msg || e.message || "Could not send link" };
    }
  },
  signOut: () => {
    const s = session;
    persist(null);
    if (s?.access_token) api("logout", {}, "POST").catch(() => {});
  },
};

// Handle magic-link hash callback
if (location.hash && location.hash.includes("access_token=")) {
  const parts = {};
  location.hash.replace(/^#/, "").split("&").forEach((kv) => {
    const [k, v] = kv.split("=");
    parts[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  if (parts.access_token) {
    setFromTokenResponse({
      access_token: parts.access_token,
      refresh_token: parts.refresh_token,
      expires_in: +parts.expires_in || 3600,
    });
    // fetch user
    fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + parts.access_token },
    }).then((r) => r.json()).then((u) => { if (session) persist({ ...session, user: u }); }).catch(() => {});
    history.replaceState(null, "", location.pathname);
  }
}
