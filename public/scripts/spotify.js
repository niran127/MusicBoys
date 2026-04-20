const SP_CLIENT_ID = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET = "f9a584351aac45889f29e806274d73c4";
const SP_REDIRECT_URI = "http://127.0.0.1:3050";
const SP_SCOPES =
  "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";
// backend sync state
let backendUser = null;
let cachedLikes = [];
let cachedPlaylists = [];


// max volume regelaar, 1 is max, 0.5 is 50%
const VOLUME_LIMIT = 0.3;
// pkce helpers
function genVerifier(len = 128) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const vals = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(vals, (v) => chars[v % chars.length]).join("");
}
async function genChallenge(verifier) {
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
      await syncUserWithBackend(); // Sync user immediately after login
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
function spotifyLogout(shouldReload = true) {
  ["sp_at", "sp_rt", "sp_exp", "sp_pkce"].forEach((k) =>
    localStorage.removeItem(k),
  );
  if (spPlayer) {
    try { spPlayer.disconnect(); } catch(e) {}
    spPlayer = null;
  }
  spDeviceId = null;
  setLoginBtn("disconnected");

  if (shouldReload) {
    // Only refresh if explicitly requested (usually from the Logout button)
    window.location.href = window.location.origin;
  }
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

// backend-backed data helpers
async function syncUserWithBackend() {
  if (!spIsLoggedIn()) return;
  
  try {
    const me = await spotifyGetMe();
    if (!me) return;
    
    const syncRes = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: me.id, name: me.display_name })
    });
    
    if (!syncRes.ok) return;

    const [likesRes, playRes, artistsRes] = await Promise.all([
      fetch(`/api/user/likes`),
      fetch(`/api/user/playlists`),
      fetch(`/api/user/artists`)
    ]);
    
    cachedLikes = await likesRes.json();
    cachedPlaylists = await playRes.json();
    cachedFollowedArtists = await artistsRes.json();
    
    const internalUser = await syncRes.json();
    backendUser = internalUser;
    
        // Instant name refresh in the UI
        if (internalUser.name) {
            const h1 = document.querySelector("#greeting span");
            const pillSpan = document.getElementById("user-name");
            if (h1) h1.textContent = internalUser.name;
            if (pillSpan) pillSpan.textContent = internalUser.name;
        }

        // Restore Last Played Track from MongoDB
        if (internalUser.lastPlayedTrack && internalUser.lastPlayedTrack.uri) {
            console.log("[MusicBoys] Laatst afgespeelde nummer hersteld:", internalUser.lastPlayedTrack.meta.name);
            setStoredCurrentTrack(internalUser.lastPlayedTrack);
            updateUIPlayer(internalUser.lastPlayedTrack.meta);
        }

        // sync cached likes
    if (typeof renderCustomPlaylists === "function") renderCustomPlaylists();
    if (typeof updateLikesPage === "function") updateLikesPage();
    // Restored last played track
    if (backendUser.lastPlayedTrack && backendUser.lastPlayedTrack.uri) {
        setStoredCurrentTrack(backendUser.lastPlayedTrack);
        if (typeof updateUIPlayer === "function") {
            updateUIPlayer(backendUser.lastPlayedTrack.meta);
        }
    } else {
        // If DB is empty but we have local storage, sync it TO the DB once
        const local = JSON.parse(localStorage.getItem("spotify_current_track") || "{}");
        if (local.uri) {
            setStoredCurrentTrack(local);
            if (typeof updateUIPlayer === "function") updateUIPlayer(local.meta);
        }
    }

    if (backendUser.currentMood && typeof window.updateHeaderMood === "function") {
        window.updateHeaderMood(backendUser.currentMood);
    }
    
    return backendUser;
  } catch (err) {
    console.error("[MusicBoys] Sync error:", err);
    return null;
  }
}

async function getBackendLikes() {
  if (!spIsLoggedIn()) return [];
  const me = await spotifyGetMe();
  if (!me) return [];
  
  const res = await fetch(`/api/user/likes`);
  return await res.json();
}

async function saveBackendLike(trackMeta) {
  if (!spIsLoggedIn()) return;
  const me = await spotifyGetMe();
  if (!me) return;
  
  await fetch(`/api/user/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track: trackMeta })
  });
}

async function saveBackendLastPlayed(track) {
  if (!spIsLoggedIn()) return;
  const me = await spotifyGetMe();
  if (!me) return;
  
  await fetch(`/api/user/last-played`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track })
  });
}

async function removeBackendLike(trackId) {
  if (!spIsLoggedIn()) return;
  const me = await spotifyGetMe();
  if (!me) return;
  
  await fetch(`/api/user/likes/${trackId}`, {
    method: 'DELETE'
  });
}

async function getBackendPlaylists() {
    if (!spIsLoggedIn()) return [];
    const me = await spotifyGetMe();
    if (!me) return [];
    
    const res = await fetch(`/api/user/playlists`);
    return await res.json();
}

window.createBackendPlaylist = async function(name, description = "") {
    if (!spIsLoggedIn()) return;
    const me = await spotifyGetMe();
    if (!me) return;
    
    const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
    });
    const newPl = await res.json();
    cachedPlaylists.push(newPl);
    if (typeof window.renderCustomPlaylists === "function") window.renderCustomPlaylists();
    return newPl;
}

window.toggleGlobalLike = async function(uri, meta) {
  if (!uri) return false;
  const targetId = getTrackId(uri);
  const likes = getLikes();
  const isNowLiked = !likes.some((l) => getTrackId(l.uri) === targetId);
  
  if (isNowLiked) {
    finalizeLike(uri, meta, meta.name);
    if (typeof window.showToast === "function") window.showToast("Nummer toegevoegd aan likes ❤️");
  } else {
    // Unlike immediately
    const idx = likes.findIndex((l) => getTrackId(l.uri) === targetId);
    if (idx !== -1) likes.splice(idx, 1);
    if (typeof window.syncGlobalLikeUI === "function") window.syncGlobalLikeUI(uri, false);
    removeBackendLike(targetId);
    if (typeof window.showToast === "function") window.showToast("Nummer verwijderd uit likes");
    return false;
  }
  return true;
};

async function finalizeLike(uri, meta, label) {
    const targetId = getTrackId(uri);
    const likes = getLikes();
    const isNowLiked = true;
    
    // ui updaten
    if (typeof window.syncGlobalLikeUI === "function") {
      window.syncGlobalLikeUI(uri, isNowLiked);
    }

    const likeObj = { 
        uri, 
        meta, 
        label, 
        id: targetId, 
        dateAdded: new Date(),
        popularity: meta.popularity || 0
    };
    
    likes.unshift(likeObj);
    saveBackendLike({ ...likeObj, ...meta }); 
    cachedLikes = likes;
}

window.addTrackToBackendPlaylist = async function(playlistId, track) {
  await fetch(`/api/playlists/${playlistId}/tracks`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track })
  });
}

window.removeTrackFromBackendPlaylist = async function(playlistId, trackId) {
  await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
    method: 'DELETE'
  });
}

window.deleteBackendPlaylist = async function(playlistId) {
  await fetch(`/api/playlists/${playlistId}`, {
    method: 'DELETE'
  });
  cachedPlaylists = cachedPlaylists.filter(p => p._id !== playlistId);
  if (typeof window.renderCustomPlaylists === "function") window.renderCustomPlaylists();
}


// opslag (cached & synced)
let cachedFollowedArtists = [];

function getLikes() {
  return cachedLikes;
}

function getFollowedArtists() {
  return cachedFollowedArtists;
}

window.getFollowedArtists = getFollowedArtists;

window.toggleGlobalFollow = async function(artistId, artistData) {
  const isFollowing = cachedFollowedArtists.some(a => a.id === artistId);
  
  if (isFollowing) {
    cachedFollowedArtists = cachedFollowedArtists.filter(a => a.id !== artistId);
    fetch(`/api/user/artists/${artistId}`, { method: 'DELETE' });
    if (typeof window.showToast === "function") window.showToast(`${artistData.name} ontvolgd`);
  } else {
    cachedFollowedArtists.push({ id: artistId, ...artistData });
    fetch('/api/user/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: { id: artistId, ...artistData } })
    });
    if (typeof window.showToast === "function") window.showToast(`${artistData.name} gevolgd!`);
  }
  
  return !isFollowing;
};

async function setLikes(likes) {
  cachedLikes = likes;
  // In a real app, you'd sync the whole list or specific changes. 
  // For now, if we use toggleGlobalLike, it calls the specific add/remove helpers.
}

window.getStoredPlaylists = function() {
    return cachedPlaylists;
}


function getStoredCurrentTrack() {
  return JSON.parse(localStorage.getItem("spotify_current_track") || "{}");
}

function setStoredCurrentTrack(data) {
  localStorage.setItem("spotify_current_track", JSON.stringify(data));
  // Sync to database for cross-device persistence
  saveBackendLastPlayed(data);
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

// wachtrij
let playbackQueue = []; 
let currentQueueIndex = -1;
// laadt de spotify player
window._initSpotifyPlayer = async () => {
  const token = await getSpToken();
  if (!token) {
    spotifyLogout(false);
    return;
  }
  spPlayer = new Spotify.Player({
    name: "MusicBoys",
    getOAuthToken: async (cb) => cb(await getSpToken()),
    volume: (localStorage.getItem("app_volume_pct") || 0.5) * VOLUME_LIMIT, // standaard bar op 50% = 15% geluidsvolume (0.5 * 0.3)
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
    showCustomModal({
      title: "Spotify Premium",
      message: "Helaas is Spotify Premium vereist voor het afspelen van muziek in deze applicatie.",
    });
  });
  spPlayer.addListener("authentication_error", () => {
    spotifyLogout(false);
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
  // Initiële volume bar stand zetten
  const initialVol = localStorage.getItem("app_volume_pct") || 0.5;
  const volFill = document.querySelector(".vol-fill");
  if (volFill) volFill.style.width = `${initialVol * 100}%`;

  document.getElementById("play-btn")?.addEventListener("click", async () => {
    // Forceer audio activatie voor browsers (interaction policy fallback)
    if (typeof spPlayer?.activateElement === "function") {
      try { await spPlayer.activateElement(); } catch(e) {}
    }
    
    // Voorkom fout als spDeviceId nog niet klaar is
    if (!spDeviceId) {
        if (typeof window.showToast === "function") window.showToast("Spotify player laadt nog, even geduld...");
        return;
    }

    const state = await spPlayer?.getCurrentState();
    if (!state || !state.track_window || !state.track_window.current_track) {
      // Restore playback explicitly
      const current = getStoredCurrentTrack();
      if (current && current.uri) {
        document.getElementById("play-btn").innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
        playSong(current.uri, current.meta);
        return;
      }
    }
    spPlayer?.togglePlay();
  });
  document
    .querySelector('.ctrl-btn[title="Volgende"]')
    ?.addEventListener("click", () => {
        if (playbackQueue.length > 0 && currentQueueIndex < playbackQueue.length - 1) {
            currentQueueIndex++;
            const next = playbackQueue[currentQueueIndex];
            playSong(next.uri, next.meta, true);
        } else {
            spPlayer?.nextTrack();
        }
    });
  document
    .querySelector('.ctrl-btn[title="Vorige"]')
    ?.addEventListener("click", () => {
        if (playbackQueue.length > 0 && currentQueueIndex > 0) {
            currentQueueIndex--;
            const prev = playbackQueue[currentQueueIndex];
            playSong(prev.uri, prev.meta, true);
        } else {
            spPlayer?.previousTrack();
        }
    });
  document.getElementById("like-btn")?.addEventListener("click", async () => {
    const current = getStoredCurrentTrack();
    if (!current.uri) return;
    if (typeof window.toggleGlobalLike === "function") {
      await window.toggleGlobalLike(current.uri, current.meta);
    }
  });
  document.querySelector(".vol-bar")?.addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    spPlayer?.setVolume(pct * VOLUME_LIMIT);
    document.querySelector(".vol-fill").style.width = `${pct * 100}%`;
    localStorage.setItem("app_volume_pct", pct);
    // Trigger een event waar het game-script naar kan luisteren
    window.dispatchEvent(new CustomEvent('volumeChange', { detail: { volume: pct } }));
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

    // opslaan in db
    fetch('/api/user/last-played', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: singleUri, meta })
    }).catch(e => console.error("Sync failed", e));

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
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        
        if (code) {
            // cleaned url van goyslop
            window.history.replaceState({}, document.title, window.location.pathname);
            await exchangeCode(code);
        }
        
        const loggedIn = spIsLoggedIn();
        setLoginBtn(loggedIn ? "loading" : "disconnected");
        
        if (loggedIn) {
            await syncUserWithBackend();
            loadPlayerFromStorage();
        } else {
            // Optional: reset player bar for non-logged-in users
            if (typeof updateUIPlayer === "function") {
               const nameEl = document.getElementById("now-name");
               const artistEl = document.getElementById("now-artist");
               const artEl = document.getElementById("now-art");
               if (nameEl) nameEl.textContent = "";
               if (artistEl) artistEl.textContent = "";
               if (artEl) artEl.innerHTML = "";
            }
        }
        
        if (window._spSDKFired && loggedIn) {
            window._initSpotifyPlayer();
        }
    } catch (err) {
        console.error("[MusicBoys] Kritieke fout bij opstarten:", err);
        // Clear de URL zowiezo als er een code staat, anders blijven we hangen
        if (window.location.search.includes("code=")) {
            window.history.replaceState({}, "", window.location.pathname);
        }
        setLoginBtn("disconnected");
    }

    // magic playlist generator
    window.generateMoodPlaylist = async function() {
      console.log("[MusicBoys] Starting overhaul generator...");
      const resultDiv = document.getElementById("generator-results");
      const listDiv = document.getElementById("generator-list");
      if (!resultDiv || !listDiv) return;

      resultDiv.style.display = "block";
      listDiv.innerHTML = '<div class="empty-state">Aan het laden</div>';
      resultDiv.scrollIntoView({ behavior: 'smooth' });

      try {
        if (!spIsLoggedIn()) {
            showFeedback("Aanmelden bij Spotify vereist!", "orange");
            return;
        }
        
        const mood = document.getElementById("current-mood-text")?.textContent?.trim() || "Focus";
        
        // 1. genre seeds
        const moodMap = {
          "Chill": "chill",
          "Focus": "study",
          "Party": "party",
          "Sad": "sad",
          "Workout": "work-out"
        };
        const seedGenre = moodMap[mood] || "pop";

        // 2. Personalization
        const likes = getLikes();
        const artistSeed = likes.length > 0 ? likes[0].meta.artist.split(',')[0] : "";
        const query = (seedGenre + " " + artistSeed).trim();
        
        // 3. titel updaten
        const titleEl = resultDiv.querySelector('.section-subtitle') || document.createElement('h3');
        titleEl.className = "section-subtitle";
        titleEl.style.marginBottom = "15px";
        titleEl.innerHTML = `<span style="color: var(--accent)">${mood} mix</span> <span style="font-size: 0.9rem; font-weight: 500; opacity: 0.6">(20 Nummers)</span>`;
        if (!resultDiv.contains(titleEl)) resultDiv.prepend(titleEl);

        // 4. Fetch 20 Tracks via Search API (Recommendations API is deprecated)
        // Add random offset to guarantee distinct results every time
        const randomOffset = Math.floor(Math.random() * 200); 
        let url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20&market=BE&offset=${randomOffset}`;

        const token = await getAuthToken();
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Spotify API fout (${response.status}): ${errorText}`);
        }

        const textBody = await response.text();
        if (!textBody) throw new Error("Geen data ontvangen van Spotify.");
        const data = JSON.parse(textBody);

        const tracks = data.tracks?.items || [];
        if (tracks.length === 0) {
            throw new Error("Geen tracks gevonden voor deze mood.");
        }

        // 5. Create Standalone Playlist
        const baseNamePrefix = `Jouw ${mood} Mix`;
        const existingMixes = cachedPlaylists.filter(p => p.name && p.name.startsWith(baseNamePrefix));
        const playlistName = `${baseNamePrefix} #${existingMixes.length + 1}`;
        let newPl;
        try {
            newPl = await window.createBackendPlaylist(playlistName, "Automatisch gegenereerde MusicBoys mix.");
        } catch (e) {
            throw new Error("Kon playlist niet aanmaken op de server.");
        }
        
        const mappedTracks = tracks.map(t => {
            return {
                uri: t.uri,
                id: t.id,
                meta: {
                    name: t.name,
                    artist: t.artists.map(a => a.name).join(", "),
                    image: t.album?.images?.[0]?.url || "",
                    artistUri: t.artists[0]?.uri
                }
            };
        });
        
        // sync met cache
        const plIndex = cachedPlaylists.findIndex(p => p._id === newPl._id);
        if (plIndex !== -1) {
            cachedPlaylists[plIndex].tracks = mappedTracks;
        }

        // DB opslaan
        await fetch(`/api/playlists/${newPl._id}/tracks`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracks: mappedTracks })
        });
        
        if (typeof window.showToast === "function") {
            window.showToast(`Mix "${playlistName}" is aangemaakt!`);
        }
        
        // Reset old generator UI and redirect to the new standalone playlist page
        resultDiv.style.display = "none";
        listDiv.innerHTML = "";
        if (typeof window.showPage === "function") {
            window.showPage("playlist", playlistName);
        }
        
        console.log("[MusicBoys] Generator Overhaul Complete!");

      } catch (err) {
        console.error("[MusicBoys] Generator Error:", err);
        listDiv.innerHTML = `<div class="empty-state">Oeps! Er ging iets mis: ${err.message}</div>`;
      }
    }

    // event listener voor playlist generator
    document.addEventListener('click', (e) => {
        const btn = e.target.closest("#generate-mood-playlist");
        if (btn) {
            e.preventDefault();
            window.generateMoodPlaylist();
        }
    });

    // Spacebar to Play/Pause
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input or textarea
        const activeTags = ['INPUT', 'TEXTAREA'];
        if (activeTags.includes(document.activeElement.tagName)) return;
        if (document.activeElement.isContentEditable) return;

        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scroll down
            const playBtn = document.getElementById("play-btn");
            if (playBtn) playBtn.click();
        }
    });

})();

