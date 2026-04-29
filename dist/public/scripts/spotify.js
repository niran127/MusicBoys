const SP_CLIENT_ID = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET = "f9a584351aac45889f29e806274d73c4";
const SP_REDIRECT_URI = window.location.origin;
const SP_SCOPES = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";
const VOLUME_LIMIT = 0.5;
function genVerifier(len = 128) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const vals = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(vals, (v) => chars[v % chars.length]).join("");
}
async function genChallenge(verifier) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
window.spotifyLogin = async function () {
    const verifier = genVerifier();
    const challenge = await genChallenge(verifier);
    localStorage.setItem("sp_pkce", verifier);
    const url = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
        client_id: SP_CLIENT_ID,
        response_type: "code",
        redirect_uri: SP_REDIRECT_URI,
        scope: SP_SCOPES,
        code_challenge_method: "S256",
        code_challenge: challenge,
    });
    window.location.href = url;
};
async function exchangeCode(code) {
    try {
        const res = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: SP_CLIENT_ID,
                grant_type: "authorization_code",
                code,
                redirect_uri: SP_REDIRECT_URI,
                code_verifier: localStorage.getItem("sp_pkce") || "",
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
    }
    catch (err) {
        console.error("[MusicBoys] Exchange code error:", err);
        window.history.replaceState({}, "", window.location.pathname);
    }
    return null;
}
async function spRefresh() {
    const rt = localStorage.getItem("sp_rt");
    if (!rt)
        return null;
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
    localStorage.setItem("sp_exp", (Date.now() + expires_in * 1000).toString());
    if (refresh_token)
        localStorage.setItem("sp_rt", refresh_token);
}
async function getSpToken() {
    const exp = parseInt(localStorage.getItem("sp_exp") || "0");
    if (localStorage.getItem("sp_at") && Date.now() < exp - 60_000)
        return localStorage.getItem("sp_at");
    return spRefresh();
}
window.spIsLoggedIn = function () {
    return !!localStorage.getItem("sp_rt");
};
window.spotifyLogout = function () {
    ["sp_at", "sp_rt", "sp_exp", "sp_pkce"].forEach((k) => localStorage.removeItem(k));
    if (spPlayer) {
        spPlayer.disconnect();
        spPlayer = null;
    }
    spDeviceId = null;
    setLoginBtn("disconnected");
};
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
    if (!token)
        token = await getClientToken();
    return token;
}
window.getLikes = function () {
    return JSON.parse(localStorage.getItem("spotify_liked_tracks") || "[]");
};
window.setLikes = function (likes) {
    localStorage.setItem("spotify_liked_tracks", JSON.stringify(likes));
};
window.getFollowedArtists = function () {
    return JSON.parse(localStorage.getItem("spotify_followed_artists") || "[]");
};
window.setFollowedArtists = function (artists) {
    localStorage.setItem("spotify_followed_artists", JSON.stringify(artists));
};
window.toggleGlobalLike = async function (uri, meta) {
    let likes = window.getLikes();
    const trackId = window.getTrackId(uri);
    const isLiked = likes.some(l => window.getTrackId(l.uri) === trackId);
    try {
        if (isLiked) {
            // Remove
            const res = await fetch(`/api/user/likes/${trackId}`, { method: 'DELETE' });
            if (res.ok) {
                likes = await res.json();
            }
        }
        else {
            // Add
            const res = await fetch('/api/user/likes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ track: { id: trackId, uri, meta } })
            });
            if (res.ok) {
                likes = await res.json();
            }
        }
        window.setLikes(likes);
        if (typeof window.syncGlobalLikeUI === "function") {
            window.syncGlobalLikeUI(uri, !isLiked);
        }
        return !isLiked;
    }
    catch (err) {
        console.error("Fout bij bijwerken likes:", err);
        return isLiked;
    }
};
window.toggleGlobalFollow = async function (artistId, artistData) {
    let artists = window.getFollowedArtists();
    const isFollowing = artists.some(a => a.id === artistId);
    try {
        if (isFollowing) {
            const res = await fetch(`/api/user/artists/${artistId}`, { method: 'DELETE' });
            if (res.ok)
                artists = await res.json();
        }
        else {
            const res = await fetch('/api/user/artists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artist: artistData })
            });
            if (res.ok)
                artists = await res.json();
        }
        window.setFollowedArtists(artists);
        return !isFollowing;
    }
    catch (err) {
        console.error("Fout bij bijwerken volgen:", err);
        return isFollowing;
    }
};
window.getStoredCurrentTrack = function () {
    return JSON.parse(localStorage.getItem("spotify_current_track") || "{}");
};
window.setStoredCurrentTrack = function (data) {
    localStorage.setItem("spotify_current_track", JSON.stringify(data));
};
async function syncDataWithBackend() {
    try {
        const [likesRes, artistsRes] = await Promise.all([
            fetch('/api/user/likes'),
            fetch('/api/user/artists')
        ]);
        if (likesRes.ok) {
            const likes = await likesRes.json();
            window.setLikes(likes);
        }
        if (artistsRes.ok) {
            const artists = await artistsRes.json();
            window.setFollowedArtists(artists);
        }
    }
    catch (err) {
        console.error("Fout bij synchroniseren met backend:", err);
    }
}
window.spotifySearch = async function (query, type) {
    const token = await getAuthToken();
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`, { headers: { Authorization: `Bearer ${token}` } });
    return response.json();
};
window.spotifyGetArtist = async function (artistId) {
    const token = await getAuthToken();
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
};
window.spotifyGetArtistTopTracks = async function (artistId) {
    const token = await getAuthToken();
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=BE`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
};
window.spotifyGetArtistAlbums = async function (artistId) {
    const token = await getAuthToken();
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=10&market=BE`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
};
window.spotifyGetTrack = async function (trackId) {
    const token = await getAuthToken();
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
};
window.spotifyGetMe = async function () {
    const token = await getAuthToken();
    if (!token)
        return null;
    const res = await fetch(`https://api.spotify.com/v1/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok)
        return null;
    return res.json();
};
let spPlayer = null;
let spDeviceId = null;
let spInterval = null;
window._initSpotifyPlayer = async () => {
    const token = await getSpToken();
    if (!token) {
        window.spotifyLogout();
        return;
    }
    spPlayer = new window.Spotify.Player({
        name: "MusicBoys",
        getOAuthToken: async (cb) => cb(await getSpToken()),
        volume: 0.5 * VOLUME_LIMIT,
    });
    spPlayer.addListener("ready", ({ device_id }) => {
        spDeviceId = device_id;
        setLoginBtn("connected");
        wirePlayerControls();
    });
    spPlayer.addListener("not_ready", () => {
        spDeviceId = null;
    });
    spPlayer.addListener("player_state_changed", (state) => {
        if (state)
            updatePlayerBar(state);
    });
    spPlayer.addListener("account_error", () => {
        window.showCustomModal({
            title: "Spotify Premium",
            message: "Helaas is Spotify Premium vereist voor het afspelen van muziek in deze applicatie.",
        });
    });
    spPlayer.addListener("authentication_error", () => {
        window.spotifyLogout();
    });
    spPlayer.connect();
};
window.getTrackId = function (uri) {
    if (typeof uri !== "string")
        return uri;
    return uri.split(":").pop();
};
function wirePlayerControls() {
    document.getElementById("play-btn")?.addEventListener("click", async () => {
        const state = await spPlayer?.getCurrentState();
        if (!state || !state.track_window?.current_track) {
            const current = window.getStoredCurrentTrack();
            if (current.uri && current.meta) {
                window.playSong(current.uri, current.meta);
                return;
            }
        }
        spPlayer?.togglePlay();
    });
    document.querySelector('.ctrl-btn[title="Volgende"]')?.addEventListener("click", () => spPlayer?.nextTrack());
    document.querySelector('.ctrl-btn[title="Vorige"]')?.addEventListener("click", () => spPlayer?.previousTrack());
    document.getElementById("like-btn")?.addEventListener("click", () => {
        const current = window.getStoredCurrentTrack();
        if (!current.uri)
            return;
        if (typeof window.toggleGlobalLike === "function") {
            window.toggleGlobalLike(current.uri, current.meta);
        }
    });
    document.querySelector(".vol-bar")?.addEventListener("click", (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        spPlayer?.setVolume(pct * VOLUME_LIMIT);
        document.querySelector(".vol-fill").style.width = `${pct * 100}%`;
        localStorage.setItem("app_volume_pct", pct.toString());
    });
}
function updateUIPlayer(meta) {
    if (!meta)
        return;
    const nameEl = document.getElementById("now-name");
    const artistEl = document.getElementById("now-artist");
    if (nameEl)
        nameEl.textContent = meta.name || "";
    if (artistEl) {
        artistEl.textContent = meta.artist || "";
        if (meta.artistUri) {
            artistEl.dataset.uri = meta.artistUri;
            artistEl.style.cursor = "pointer";
        }
        else {
            delete artistEl.dataset.uri;
            artistEl.style.cursor = "default";
        }
    }
    const artEl = document.getElementById("now-art");
    if (artEl) {
        if (meta.image) {
            artEl.innerHTML = `<img src="${meta.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
        }
        else {
            artEl.innerHTML = "";
        }
    }
}
window.playSong = async function (trackUri, meta, isNavAction = false) {
    const token = await getAuthToken();
    if (!token) {
        window.spotifyLogin();
        return;
    }
    if (!spDeviceId)
        return;
    const body = Array.isArray(trackUri) ? { uris: trackUri } : { uris: [trackUri] };
    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok)
            console.error("[MusicBoys] Playback error:", await response.json());
    }
    catch (err) {
        console.error("[MusicBoys] Playback fetch error:", err);
    }
    if (meta) {
        updateUIPlayer(meta);
        const playBtn = document.getElementById("play-btn");
        if (playBtn)
            playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
        const singleUri = Array.isArray(trackUri) ? trackUri[0] : trackUri;
        const isLiked = window.getLikes().some((l) => window.getTrackId(l.uri) === window.getTrackId(singleUri));
        const btn = document.getElementById("like-btn");
        if (btn)
            btn.classList.toggle("liked", isLiked);
        window.setStoredCurrentTrack({ uri: singleUri, meta });
        if (!isNavAction) {
            let hist = JSON.parse(localStorage.getItem("spotify_history") || "[]");
            const checkUri = Array.isArray(trackUri) ? trackUri[0] : trackUri;
            if (hist.length === 0 || hist[hist.length - 1].uri !== checkUri) {
                hist.push({ uri: checkUri, meta });
                if (hist.length > 50)
                    hist.shift();
                localStorage.setItem("spotify_history", JSON.stringify(hist));
            }
        }
    }
    clearInterval(spInterval);
    spInterval = setInterval(async () => {
        const st = await spPlayer?.getCurrentState();
        if (st)
            updatePlayerBar(st);
    }, 1000);
};
function updatePlayerBar(state) {
    const track = state.track_window?.current_track;
    if (!track)
        return;
    const currentName = document.getElementById("now-name")?.textContent;
    if (currentName !== track.name) {
        const meta = {
            name: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            artistUri: track.artists[0]?.uri || null,
            image: track.album?.images?.[0]?.url,
        };
        updateUIPlayer(meta);
        window.setStoredCurrentTrack({ uri: track.uri, meta });
        const isLiked = window.getLikes().some((l) => window.getTrackId(l.uri) === window.getTrackId(track.uri));
        const likeBtn = document.getElementById("like-btn");
        if (likeBtn) {
            if (isLiked)
                likeBtn.classList.add("liked");
            else
                likeBtn.classList.remove("liked");
        }
    }
    const pos = state.position ?? 0, dur = state.duration || 1;
    const progressFill = document.getElementById("progress-fill");
    if (progressFill)
        progressFill.style.width = `${(pos / dur) * 100}%`;
    const progCurr = document.getElementById("progress-current");
    if (progCurr)
        progCurr.textContent = fmtTime(pos / 1000);
    const progTot = document.getElementById("progress-total");
    if (progTot)
        progTot.textContent = fmtTime(dur / 1000);
    const playBtn = document.getElementById("play-btn");
    if (playBtn)
        playBtn.innerHTML = state.paused
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
}
function fmtTime(secs) {
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}
function setLoginBtn(state) {
    const btn = document.getElementById("spotify-login-btn");
    if (!btn)
        return;
    if (state === "connected") {
        btn.textContent = "Verbonden";
        btn.classList.add("connected");
        btn.onclick = () => window.spotifyLogout();
    }
    else if (state === "loading") {
        btn.textContent = "Verbinden...";
        btn.classList.remove("connected");
        btn.onclick = null;
    }
    else {
        btn.textContent = "Login Spotify";
        btn.classList.remove("connected");
        btn.onclick = () => window.spotifyLogin();
    }
}
function loadPlayerFromStorage() {
    const current = window.getStoredCurrentTrack();
    if (current.uri && current.meta) {
        updateUIPlayer(current.meta);
        const isLiked = window.getLikes().some((l) => window.getTrackId(l.uri) === window.getTrackId(current.uri));
        const btn = document.getElementById("like-btn");
        if (btn)
            btn.classList.toggle("liked", isLiked);
    }
}
(async () => {
    try {
        await syncDataWithBackend();
        const code = new URLSearchParams(window.location.search).get("code");
        if (code)
            await exchangeCode(code);
        const loggedIn = window.spIsLoggedIn();
        setLoginBtn(loggedIn ? "loading" : "disconnected");
        if (window._spSDKFired && loggedIn)
            window._initSpotifyPlayer();
        loadPlayerFromStorage();
    }
    catch (err) {
        console.error("[MusicBoys] Kritieke fout bij opstarten:", err);
        if (window.location.search.includes("code="))
            window.history.replaceState({}, "", window.location.pathname);
        setLoginBtn("disconnected");
    }
})();
export {};
