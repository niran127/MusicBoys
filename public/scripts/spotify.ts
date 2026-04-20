const SP_CLIENT_ID: string = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET: string = "f9a584351aac45889f29e806274d73c4";

declare global {
    interface Window {
        onSpotifyWebPlaybackSDKReady: () => void;
        _spSDKFired: boolean;
        _initSpotifyPlayer: () => void;
        getTrackId: (uri: string) => string;
    }
    const Spotify: any;
    const toggleGlobalLike: (uri: string, meta: any) => void;
}
const SP_REDIRECT_URI: string = "http://localhost:1234"; // Aangepast naar de lokale poort
const SP_SCOPES: string =
  "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";
const VOLUME_LIMIT: number = 0.5;
// pkce helpers
function genVerifier(len: number = 128): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const vals = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(vals, (v) => chars[v % chars.length]).join("");
}
async function genChallenge(verifier: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
// login met spotify
async function spotifyLogin() {
  const verifier = genVerifier();
  const challenge = await genChallenge(verifier);
  localStorage.setItem("sp_pkce", verifier);
  const url =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      client_id: SP_CLIENT_ID,
      response_type: "code",
      redirect_uri: SP_REDIRECT_URI,
      scope: SP_SCOPES,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
  window.location.href = url;
}
async function exchangeCode(code) {
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SP_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: SP_REDIRECT_URI,
        code_verifier: localStorage.getItem("sp_pkce"),
      }),
    });
    
    if (!res.ok) {
        const errText = await res.text();
        console.error("[MusicBoys] Token exchange failed:", res.status, errText);
        window.history.replaceState({}, "", window.location.pathname);
        return null;
    }

    const d = await res.json();
    if (d.access_token) {
      storeTokens(d);
      window.history.replaceState({}, "", window.location.pathname);
      return d.access_token;
    }
  } catch (err) {
    console.error("[MusicBoys] Exchange code error:", err);
    window.history.replaceState({}, "", window.location.pathname);
  }
  return null;
}
async function spRefresh() {
  const rt = localStorage.getItem("sp_rt");
  if (!rt) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: SP_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: rt,
    }),
  });
  const d = await res.json();
  if (d.access_token) {
    storeTokens(d);
    return d.access_token;
  }
  return null;
}

function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem("sp_at", access_token);
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
  return !!localStorage.getItem("sp_rt");
}
// uitloggen: alles opschonen
function spotifyLogout() {
  ["sp_at", "sp_rt", "sp_exp", "sp_pkce"].forEach((k) =>
    localStorage.removeItem(k),
  );
  if (spPlayer) {
    spPlayer.disconnect();
    spPlayer = null;
  }
  spDeviceId = null;
  setLoginBtn("disconnected");
}
// voor guests (zonder login)
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
async function getAuthToken() {
  let token = await getSpToken();
  if (!token) token = await getClientToken();
  return token;
}
// opslag
function getLikes() {
  return JSON.parse(localStorage.getItem("spotify_liked_tracks") || "[]");
}

function setLikes(likes) {
  localStorage.setItem("spotify_liked_tracks", JSON.stringify(likes));
}

function getStoredCurrentTrack() {
  return JSON.parse(localStorage.getItem("spotify_current_track") || "{}");
}

function setStoredCurrentTrack(data) {
  localStorage.setItem("spotify_current_track", JSON.stringify(data));
}
// zoeken: gebruikt user token als je ingelogd bent, anders client token
async function spotifySearch(query, type) {
  const token = await getAuthToken();
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.json();
}
async function spotifyGetArtist(artistId) {
  const token = await getAuthToken();
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
async function spotifyGetArtistTopTracks(artistId) {
  const token = await getAuthToken();
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=BE`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.json();
}
async function spotifyGetArtistAlbums(artistId) {
  const token = await getAuthToken();
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=10&market=BE`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.json();
}
async function spotifyGetTrack(trackId) {
  const token = await getAuthToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
async function spotifyGetMe() {
  const token = await getAuthToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}
// player settings
let spPlayer = null;
let spDeviceId = null;
let spInterval = null;
// laadt de spotify player
window._initSpotifyPlayer = async () => {
  const token = await getSpToken();
  if (!token) {
    spotifyLogout();
    return;
  }
  spPlayer = new Spotify.Player({
    name: "MusicBoys",
    getOAuthToken: async (cb) => cb(await getSpToken()),
    volume: 0.5 * VOLUME_LIMIT, // standaard volume wanneer je app laadt. 0.5 = 50%
  });
  spPlayer.addListener("ready", ({ device_id }) => {
    spDeviceId = device_id;
    setLoginBtn("connected");
    wirePlayerControls();
    console.log("[MusicBoys] Spotify klaar");
  });
  spPlayer.addListener("not_ready", () => {
    spDeviceId = null;
  });
  spPlayer.addListener("player_state_changed", (state) => {
    if (state) updatePlayerBar(state);
  });
  spPlayer.addListener("account_error", () => {
    alert("Spotify Premium vereist voor afspelen.");
  });
  spPlayer.addListener("authentication_error", () => {
    spotifyLogout();
  });
  spPlayer.connect();
};
// checked id duplicate
if (typeof window.getTrackId !== "function") {
  window.getTrackId = function (uri) {
    if (typeof uri !== "string") return uri;
    return uri.split(":").pop();
  };
}

function wirePlayerControls() {
  document.getElementById("play-btn")?.addEventListener("click", async () => {
    const state = await spPlayer?.getCurrentState();
    if (!state || !state.track_window?.current_track) {
      const current = getStoredCurrentTrack();
      if (current.uri && current.meta) {
        playSong(current.uri, current.meta);
        return;
      }
    }
    spPlayer?.togglePlay();
  });
  document
    .querySelector('.ctrl-btn[title="Volgende"]')
    ?.addEventListener("click", () => spPlayer?.nextTrack());
  document
    .querySelector('.ctrl-btn[title="Vorige"]')
    ?.addEventListener("click", () => spPlayer?.previousTrack());
  document.getElementById("like-btn")?.addEventListener("click", () => {
    const current = getStoredCurrentTrack();
    if (!current.uri) return;
    if (typeof toggleGlobalLike === "function") {
      toggleGlobalLike(current.uri, current.meta);
    }
  });
  document.querySelector(".vol-bar")?.addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    spPlayer?.setVolume(pct * VOLUME_LIMIT);
    document.querySelector(".vol-fill").style.width = `${pct * 100}%`;
    // volume globaal opslaan voor andere scripts (bv game)
    localStorage.setItem("app_volume_pct", pct);
  });
}
// player bar bijwerken met metadata
function updateUIPlayer(meta) {
  if (!meta) return;
  const nameEl = document.getElementById("now-name");
  const artistEl = document.getElementById("now-artist");
  if (nameEl) nameEl.textContent = meta.name || "";
  if (artistEl) {
    artistEl.textContent = meta.artist || "";
    if (meta.artistUri) {
      artistEl.dataset.uri = meta.artistUri;
      artistEl.style.cursor = "pointer";
    } else {
      delete artistEl.dataset.uri;
      artistEl.style.cursor = "default";
    }
  }
  if (meta.image) {
    document.getElementById("now-art").innerHTML =
      `<img src="${meta.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
  } else {
    document.getElementById("now-art").innerHTML = "";
  }
}
async function playSong(trackUri, meta, isNavAction = false) {
  const token = await getAuthToken();
  if (!token) {
    spotifyLogin();
    return;
  }
  if (!spDeviceId) return;
  const body = Array.isArray(trackUri)
    ? {
        uris: trackUri,
      }
    : {
        uris: [trackUri],
      };
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      console.error("[MusicBoys] Playback error:", await response.json());
    }
  } catch (err) {
    console.error("[MusicBoys] Playback fetch error:", err);
  }
  // player bar updaten
  if (meta) {
    updateUIPlayer(meta);
    document.getElementById("play-btn").innerHTML =
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    const singleUri = Array.isArray(trackUri) ? trackUri[0] : trackUri;
    // update like status in player bar
    const isLiked = getLikes().some(
      (l) => getTrackId(l.uri) === getTrackId(singleUri),
    );
    const btn = document.getElementById("like-btn");
    if (btn) btn.classList.toggle("liked", isLiked);
    setStoredCurrentTrack({
      uri: singleUri,
      meta,
    });
    if (!isNavAction) {
      // history bijwerken
      let hist = JSON.parse(localStorage.getItem("spotify_history") || "[]");
      const checkUri = Array.isArray(trackUri) ? trackUri[0] : trackUri;
      if (hist.length === 0 || hist[hist.length - 1].uri !== checkUri) {
        hist.push({
          uri: checkUri,
          meta,
        });
        if (hist.length > 50) hist.shift();
        localStorage.setItem("spotify_history", JSON.stringify(hist));
      }
    }
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
  const currentName = document.getElementById("now-name").textContent;
  if (currentName !== track.name) {
    const meta = {
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      artistUri: track.artists[0]?.uri || null,
      image: track.album?.images?.[0]?.url,
    };
    updateUIPlayer(meta);
    setStoredCurrentTrack({
      uri: track.uri,
      meta,
    });
    const isLiked = getLikes().some(
      (l) => getTrackId(l.uri) === getTrackId(track.uri),
    );
    const likeBtn = document.getElementById("like-btn");
    if (likeBtn) {
      if (isLiked) likeBtn.classList.add("liked");
      else likeBtn.classList.remove("liked");
    }
  }
  const pos = state.position ?? 0,
    dur = state.duration || 1;
  document.getElementById("progress-fill").style.width =
    `${(pos / dur) * 100}%`;
  document.getElementById("progress-current").textContent = fmtTime(pos / 1000);
  document.getElementById("progress-total").textContent = fmtTime(dur / 1000);
  document.getElementById("play-btn").innerHTML = state.paused
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60),
    s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
// spotify login met statussen verbonden, loading, disconnected
function setLoginBtn(state) {
  const btn = document.getElementById("spotify-login-btn");
  if (!btn) return;
  if (state === "connected") {
    btn.textContent = "Verbonden";
    btn.classList.add("connected");
    btn.onclick = () => spotifyLogout();
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
// sessie herstellen
function loadPlayerFromStorage() {
  const current = getStoredCurrentTrack();
  if (current.uri && current.meta) {
    updateUIPlayer(current.meta);
    const isLiked = getLikes().some(
      (l) => getTrackId(l.uri) === getTrackId(current.uri),
    );
    const btn = document.getElementById("like-btn");
    if (btn) btn.classList.toggle("liked", isLiked);
  }
}
// opstarten: oAuth callback en login check
(async () => {
    try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
            await exchangeCode(code);
        }
        
        const loggedIn = spIsLoggedIn();
        setLoginBtn(loggedIn ? "loading" : "disconnected");
        
        if (window._spSDKFired && loggedIn) {
            window._initSpotifyPlayer();
        }
        
        loadPlayerFromStorage();
    } catch (err) {
        console.error("[MusicBoys] Kritieke fout bij opstarten:", err);
        // Clear de URL zowiezo als er een code staat, anders blijven we hangen
        if (window.location.search.includes("code=")) {
            window.history.replaceState({}, "", window.location.pathname);
        }
        setLoginBtn("disconnected");
    }
})();
