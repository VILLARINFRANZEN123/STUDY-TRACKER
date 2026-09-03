// ============================================================
//   STUDY TRACKER — AUTH (login with Gmail/Google, Facebook,
//   or GitHub)
//   ------------------------------------------------------------
//   Two modes, chosen automatically:
//     • SIMULATED (default) — works instantly offline. Each
//       provider opens a friendly login popup and signs you in.
//       Session is saved in this browser only.
//     • FIREBASE (real)     — if window.FIREBASE_CONFIG is set,
//       this uses the Firebase Auth SDK for real Google /
//       Facebook / GitHub sign-in. Requires hosting on an
//       allowlisted domain (not file://) and the providers
//       enabled in the Firebase console.
//   ============================================================

const AUTH_STORAGE_KEY = "st_auth_user";

/* ---------- Per-user data keys ---------- */
// Every signed-in user gets their own namespaced copy of the app
// data, e.g.  st_uid:google:me@gmail.com___subjects
// Signed-out visitors share one "guest" namespace. Theme is global.
function authUserId() {
  if (!AuthManager.currentUser) return "guest";
  return `${AuthManager.currentUser.providerId}:${AuthManager.currentUser.email.toLowerCase()}`;
}

function userKey(k) {
  return `st_uid:${authUserId()}___${k}`;
}

function userKeyPrefix(u) {
  return `st_uid:${u.providerId}:${u.email.toLowerCase()}___`;
}

/* ---------- AuthManager: single source of truth ---------- */
const AuthManager = {
  mode: "simulated",
  currentUser: null, // null | { providerId, name, email, photoUrl, real, loginAt }

  init() {
    // Restore session first (so storage keys are correct at boot time)
    this._restore();
    if (window.FIREBASE_CONFIG) this.mode = "firebase";
  },

  _restore() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      if (u && u.providerId && u.email) {
        this.currentUser = u;
        document.body.classList.add("auth-signed-in");
      }
    } catch (e) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  _persist(u) {
    this.currentUser = u;
    if (u) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
      document.body.classList.add("auth-signed-in");
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      document.body.classList.remove("auth-signed-in");
    }
  },

  /* Sign in with a provider: simulated mode asks the friendly
     popup for an email, then creates the local account. */
  async signInWithProvider(provider) {
    const email = await showProviderPopup(provider);
    if (!email) return false; // cancelled
    await delay(400); // small loading shimmer

    const u = {
      providerId: provider,
      email,
      name: nameFromEmail(email),
      photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      real: false,
      loginAt: Date.now()
    };
    this._migrateOrReset(u);
    this._persist(u);
    onAuthUserChanged();
    return true;
  },

  /* Cleanly drop the session without touching the user's data. */
  signOut() {
    this._persist(null);
    onAuthUserChanged();
  },

  /* Detect first-time sign-in and copy any existing guest/local
     data so the user doesn't lose their work. Only runs when a
     previous session left data under the old global keys. */
  _migrateOrReset(u) {
    const keys = ["subjects", "resources", "sessions", "studyGoal", "subjectGoals"];
    const hasGlobalData = keys.some(k => localStorage.getItem(k) != null);
    if (!hasGlobalData) return;

    const target = userKeyPrefix(u);
    const hasTargetData = keys.some(k => localStorage.getItem(target + k) != null);
    if (hasTargetData) return; // don't clobber an existing account

    keys.forEach(k => localStorage.setItem(target + k, localStorage.getItem(k)));
  }
};

/* ---------- Helpers ---------- */
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function nameFromEmail(email) {
  const raw = email.split("@")[0] || "Student";
  return raw
    .split(/[._-]+/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ") || "Student";
}

function providerLabel(p) {
  return { google: "Google", facebook: "Facebook", github: "GitHub" }[p] || p;
}

function providerIcon(p) {
  return { google: "G", facebook: "f", github: "&lt;/&gt;" }[p] || "?";
}

/* ---------- Firebase (real) sign-in path ---------- */
async function firebaseSignIn(providerId) {
  if (!window.firebase) {
    showToast("Firebase SDK not loaded yet — try again in a second.", "error");
    return false;
  }
  try {
    const fb = window.firebase;
    if (!fb.auth) throw new Error("Firebase Auth SDK missing.");

    const Provider = {
      google: fb.auth.GoogleAuthProvider,
      facebook: fb.auth.FacebookAuthProvider,
      github: fb.auth.GithubAuthProvider
    }[providerId];
    if (!Provider) throw new Error(`Unknown provider "${providerId}".`);

    const provider = new Provider();
    if (providerId === "github") provider.addScope("user:email");
    if (providerId === "facebook") provider.addScope("email");

    const result = await fb.auth().signInWithPopup(provider);
    const f = result.user;
    const u = {
      providerId,
      email: (f.email || "").toLowerCase(),
      name: f.displayName || nameFromEmail(f.email || ""),
      photoUrl: f.photoURL || "",
      real: true,
      loginAt: Date.now()
    };
    AuthManager._migrateOrReset(u);
    AuthManager._persist(u);
    onAuthUserChanged();
    return true;
  } catch (err) {
    if (err && (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request")) {
      showToast("Sign-in cancelled.", "info");
    } else {
      showToast(`Sign-in failed: ${err && err.message ? err.message : "unknown error"}`, "error", 5000);
    }
    return false;
  }
}

/* ---------- Auth screen ---------- */
function createAuthRoot() {
  const div = document.createElement("div");
  div.id = "authRoot";
  div.className = "auth-root";
  div.setAttribute("aria-live", "polite");
  document.body.prepend(div);
  return div;
}

function renderAuthScreen() {
  const shell = document.getElementById("appShell");
  if (shell) shell.style.display = "none";

  const authRoot = document.getElementById("authRoot") || createAuthRoot();
  authRoot.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand" aria-hidden="true">🎓</div>
      <h1 class="auth-title">Study Tracker</h1>
      <p class="auth-sub">Sign in to save your progress and keep your streak alive.</p>

      <button class="auth-btn auth-google" data-provider="google" title="Continue with Google">
        <span class="auth-btn-icon" aria-hidden="true">G</span>
        <span class="auth-btn-text">Continue with Google</span>
      </button>
      <button class="auth-btn auth-facebook" data-provider="facebook" title="Continue with Facebook">
        <span class="auth-btn-icon" aria-hidden="true">f</span>
        <span class="auth-btn-text">Continue with Facebook</span>
      </button>
      <button class="auth-btn auth-github" data-provider="github" title="Continue with GitHub">
        <span class="auth-btn-icon" aria-hidden="true">&lt;/&gt;</span>
        <span class="auth-btn-text">Continue with GitHub</span>
      </button>

      <div class="auth-meta">
        <span>${AuthManager.mode === "firebase"
          ? "🔒 Secured by Firebase"
          : "🛡️ Demo mode — works offline, data stays on this device"}</span>
      </div>
    </div>`;

  document.body.classList.add("auth-screen");
  document.body.classList.remove("auth-signed-in");

  authRoot.querySelectorAll("[data-provider]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const provider = btn.dataset.provider;
      btn.classList.add("loading");
      btn.disabled = true;
      try {
        if (AuthManager.mode === "firebase") {
          await firebaseSignIn(provider);
        } else {
          await AuthManager.signInWithProvider(provider);
        }
      } finally {
        btn.classList.remove("loading");
        btn.disabled = false;
      }
    });
  });
}

/* Swap from the auth screen to the app shell. */
function showApp() {
  const authRoot = document.getElementById("authRoot");
  if (authRoot) authRoot.remove();
  document.body.classList.remove("auth-screen");
  const shell = document.getElementById("appShell");
  if (shell) shell.style.display = "";
}

/* ---------- Provider login popup (simulated mode) ----------
   Mimics the provider OAuth window: a mini popup with a form.
   Resolves with the chosen email, or null if cancelled.      */
function showProviderPopup(provider) {
  return new Promise(resolve => {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay provider-popup-overlay";

    const isFacebook = provider === "facebook";
    overlay.innerHTML = `
      <div class="modal provider-popup" role="dialog" aria-modal="true" aria-label="Sign in with ${providerLabel(provider)}">
        <button class="modal-close" type="button" aria-label="Close">✕</button>
        <div class="provider-popup-head">
          <div class="provider-popup-logo ${provider}" aria-hidden="true">${isFacebook ? "f" : provider === "github" ? "&lt;/&gt;" : "G"}</div>
          <p class="provider-popup-title">Sign in with ${providerLabel(provider)}</p>
          <p class="provider-popup-sub">to continue to Study Tracker</p>
        </div>
        <div class="provider-popup-form">
          <input type="email" id="providerEmail" class="provider-input"
                 placeholder="Your email (demo)" autocomplete="email"
                 value="student@${provider}.example.com"
                 aria-label="${providerLabel(provider)} email">
          <button class="provider-popup-cta ${provider}" data-cta>Continue</button>
        </div>
        <p class="provider-popup-foot">🔒 Demo popup — no real ${providerLabel(provider)} account is contacted.</p>
      </div>`;

    document.body.appendChild(overlay);
    const input = overlay.querySelector("#providerEmail");
    document.body.classList.add("no-scroll");

    function done() {
      overlay.remove();
      document.body.classList.remove("no-scroll");
    }

    overlay.querySelector(".modal-close").addEventListener("click", () => { done(); resolve(null); });
    overlay.addEventListener("click", e => {
      if (e.target === overlay) { done(); resolve(null); }
    });
    overlay.querySelector("[data-cta]").addEventListener("click", () => {
      const email = input.value.trim();
      if (!email || !email.includes("@")) {
        input.classList.add("input-error");
        showToast("Enter a valid email to continue.", "error");
        return;
      }
      done();
      resolve(email);
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        overlay.querySelector("[data-cta]").click();
      }
    });
    setTimeout(() => input.focus(), 50);
  });
}

/* ---------- Auth state router ----------
   Called whenever auth state changes: show the right screen and
   refresh every piece of UI that depends on the user. */
function onAuthUserChanged() {
  if (!AuthManager.currentUser) {
    updateAuthBar(); // clears the sidebar chip
    renderAuthScreen();
    return;
  }
  showApp();
  updateAuthBar();
  if (typeof updateGreetingAndClock === "function") updateGreetingAndClock();
  if (typeof init === "function") init();
}

/* ---------- Sidebar user chip + menu ---------- */
function updateAuthBar() {
  const bar = document.getElementById("authBar");
  if (!bar) return;
  const u = AuthManager.currentUser;
  if (!u) { bar.innerHTML = ""; return; }
  bar.innerHTML = `
    <div class="user-chip-wrap">
      <button class="user-chip" id="userChip" onclick="toggleUserMenu()" title="Account">
        <img class="user-chip-avatar" src="${escapeHtml(u.photoUrl || "")}" alt="" crossorigin="anonymous">
        <span class="user-chip-name">${escapeHtml(u.name || "Student")}</span>
        <span class="user-chip-provider">${providerLabel(u.providerId)}</span>
      </button>
      <div class="user-menu" id="userMenu">
        <div class="user-menu-head">
          <img class="user-menu-avatar" src="${escapeHtml(u.photoUrl || "")}" alt="" crossorigin="anonymous">
          <div>
            <span class="user-menu-name">${escapeHtml(u.name || "Student")}</span>
            <span class="user-menu-email">${escapeHtml(u.email)}</span>
          </div>
        </div>
        <div class="user-menu-label">Signed in with ${providerLabel(u.providerId)}${u.real ? " 🔒" : " (demo)"}</div>
        <button class="user-menu-logout" onclick="logout()">🚪 &nbsp;Log out</button>
      </div>
    </div>`;
}

function toggleUserMenu() {
  const menu = document.getElementById("userMenu");
  if (menu) menu.classList.toggle("open");
}

function closeUserMenu() {
  const menu = document.getElementById("userMenu");
  if (menu) menu.classList.remove("open");
}

function logout() {
  closeUserMenu();
  AuthManager.signOut();
  showToast("Signed out. See you soon! 👋", "info");
}

document.addEventListener("click", e => {
  const menu = document.getElementById("userMenu");
  if (menu && menu.classList.contains("open") && !e.target.closest(".user-chip-wrap")) {
    menu.classList.remove("open");
  }
});

/* ---------- Bootstrap (loads Firebase SDK only if configured) ---------- */
function loadFirebaseAndStart() {
  if (!window.FIREBASE_CONFIG) {
    AuthManager.init();
    onAuthUserChanged();
    return;
  }
  const load = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
  (async () => {
    try {
      if (!window.firebase) await load("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
      if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
        if (!window.firebase || !window.firebase.initializeApp) throw new Error("Firebase app SDK missing.");
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      if (!window.firebase.auth) await load("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js");
      AuthManager.mode = "firebase";
    } catch (err) {
      console.error("Firebase init failed, falling back to simulated auth.", err);
      AuthManager.mode = "simulated";
    } finally {
      AuthManager.init();
      onAuthUserChanged();
    }
  })();
}

function startAuth() {
  loadFirebaseAndStart();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAuth);
} else {
  startAuth();
}



