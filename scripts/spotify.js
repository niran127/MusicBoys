const SP_CLIENT_ID     = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET = "f9a584351aac45889f29e806274d73c4";
const SP_REDIRECT_URI  = "http://127.0.0.1:3050";
const SP_SCOPES        = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";

// max volume regelaar, 1 is max, 0.5 is 50%
const VOLUME_LIMIT = 0.5; 


// PKCE helpers
function genVerifier(len = 128) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const vals  = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(vals, v => chars[v % chars.length]).join("");
}
async function genChallenge(verifier) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// login met spotify
async function spotifyLogin() {
  const verifier  = genVerifier();
  const challenge = await genChallenge(verifier);
  localStorage.setItem("sp_pkce", verifier);
  const url = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
    client_id: SP_CLIENT_ID, response_type: "code",
    redirect_uri: SP_REDIRECT_URI, scope: SP_SCOPES,
    code_challenge_method: "S256", code_challenge: challenge,
  });
  window.location.href = url;
}

async function exchangeCode(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SP_CLIENT_ID, grant_type: "authorization_code",
      code, redirect_uri: SP_REDIRECT_URI,
      code_verifier: localStorage.getItem("sp_pkce"),
    }),
  });
  const d = await res.json();
  if (d.access_token) {
    storeTokens(d);
    window.history.replaceState({}, "", window.location.pathname);
    return d.access_token;
  }
  return null;
}

async function spRefresh() {
  const rt = localStorage.getItem("sp_rt");
  if (!rt) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: SP_CLIENT_ID, grant_type: "refresh_token", refresh_token: rt }),
  });
  const d = await res.json();
  if (d.access_token) { storeTokens(d); return d.access_token; }
  return null;
}

function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem("sp_at",  access_token);
  localStorage.setItem("sp_exp", Date.now() + expires_in * 1000);
  if (refresh_token) localStorage.setItem("sp_rt", refresh_token);
}

async function getSpToken() {
  const exp = parseInt(localStorage.getItem("sp_exp") || "0");
  if (localStorage.getItem("sp_at") && Date.now() < exp - 60_000)
    return localStorage.getItem("sp_at");
  return spRefresh();
}

function spIsLoggedIn() {
  return !!(localStorage.getItem("sp_at") && localStorage.getItem("sp_rt"));
}

// voor guests
async function getClientToken() {
  const credentials = btoa(SP_CLIENT_ID + ":" + SP_CLIENT_SECRET);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + credentials,
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}

// search functie: gebruikt user token als je ingelogd bent, anders client token
async function spotifySearch(query, type) {
  let token = await getSpToken();
  if (!token) token = await getClientToken();

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.json();
}

// player
let spPlayer   = null;
let spDeviceId = null;
let spInterval = null;

// laadt de spotify player
window._initSpotifyPlayer = async () => {
  const token = await getSpToken();
  if (!token) return;

  spPlayer = new Spotify.Player({
    name: "MusicMatch",
    getOAuthToken: async cb => cb(await getSpToken()),
    volume: 0.5 * VOLUME_LIMIT,    // standaard volume wanneer je app laadt. 0.5 = 50%
  });

  spPlayer.addListener("ready", ({ device_id }) => {
    spDeviceId = device_id;
    setLoginBtn("connected");
    wirePlayerControls();
    console.log("[MusicMatch] Spotify klaar ✓");
  });
  spPlayer.addListener("not_ready",            ()    => { spDeviceId = null; });
  spPlayer.addListener("player_state_changed", state => { if (state) updatePlayerBar(state); });
  spPlayer.addListener("account_error",        ()    => { alert("Spotify Premium vereist voor afspelen."); });
  spPlayer.addListener("authentication_error", ()    => { localStorage.removeItem("sp_at"); setLoginBtn("disconnected"); });

  spPlayer.connect();
};

function wirePlayerControls() {
  document.getElementById("play-btn")
    ?.addEventListener("click", () => spPlayer?.togglePlay());
  document.querySelector('.ctrl-btn[title="Volgende"]')
    ?.addEventListener("click", () => spPlayer?.nextTrack());
  document.querySelector('.ctrl-btn[title="Vorige"]')
    ?.addEventListener("click", () => spPlayer?.previousTrack());

  document.querySelector(".progress-bar")
    ?.addEventListener("click", async e => {
      const state = await spPlayer?.getCurrentState();
      if (!state) return;
      const r = e.currentTarget.getBoundingClientRect();
      spPlayer?.seek(Math.round(((e.clientX - r.left) / r.width) * state.duration));
    });

  document.querySelector(".vol-bar")
    ?.addEventListener("click", e => {
      const r   = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      spPlayer?.setVolume(pct * VOLUME_LIMIT);
      document.querySelector(".vol-fill").style.width = `${pct * 100}%`;
    });
}

async function playSong(trackUri, meta) {
  const token = await getSpToken();
  if (!token)     { alert("Log in met Spotify om nummers af te spelen."); spotifyLogin(); return; }
  if (!spDeviceId){ alert("Spotify speler is nog niet klaar. Wacht even."); return; }

  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [trackUri] }),
  });

  // playerbalk updaten
  if (meta) {
    document.getElementById("now-name").textContent   = meta.name;
    document.getElementById("now-artist").textContent = meta.artist;
    if (meta.image) {
      document.getElementById("now-art").innerHTML =
        `<img src="${meta.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
    }
    document.getElementById("play-btn").innerHTML =
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  }

  clearInterval(spInterval);
  spInterval = setInterval(async () => {
    const st = await spPlayer?.getCurrentState();
    if (st) updatePlayerBar(st);
  }, 1000);
}

function updatePlayerBar(state) {
  const track = state.track_window?.current_track;
  if (!track) return;

  document.getElementById("now-name").textContent   = track.name;
  document.getElementById("now-artist").textContent = track.artists.map(a => a.name).join(", ");

  const imgUrl = track.album?.images?.[0]?.url;
  if (imgUrl) {
    const art = document.getElementById("now-art");
    if (art.querySelector("img")?.src !== imgUrl) {
      art.innerHTML = `<img src="${imgUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
    }
  }

  const pos = state.position ?? 0, dur = state.duration || 1;
  document.getElementById("progress-fill").style.width    = `${(pos / dur) * 100}%`;
  document.getElementById("progress-current").textContent = fmtTime(pos / 1000);
  document.getElementById("progress-total").textContent   = fmtTime(dur / 1000);

  document.getElementById("play-btn").innerHTML = state.paused
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// spotify login met statussen verbonden, loading, disconnected
function setLoginBtn(state) {
  const btn = document.getElementById("spotify-login-btn");
  if (!btn) return;
  if (state === "connected") {
    btn.textContent = "Verbonden";
    btn.classList.add("connected");
    btn.onclick = () => {
      ["sp_at","sp_rt","sp_exp","sp_pkce"].forEach(k => localStorage.removeItem(k));
      spPlayer?.disconnect();
      spDeviceId = null;
      setLoginBtn("disconnected");
    };
  } else if (state === "loading") {
    btn.textContent = "Verbinden...";
    btn.classList.remove("connected");
    btn.onclick = null;
  } else {
    btn.textContent = "Login Spotify";
    btn.classList.remove("connected");
    btn.onclick = spotifyLogin;
  }
}

// Init: verwerk OAuth callback en zet knop
(async () => {
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) await exchangeCode(code);
  setLoginBtn(spIsLoggedIn() ? "loading" : "disconnected");

  if (window._spSDKFired && spIsLoggedIn()) {
    window._initSpotifyPlayer();
  }
})();
