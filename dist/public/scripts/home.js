const greetingEl = document.getElementById("greeting");
function setGreeting(name = "gebruiker") {
    if (!greetingEl)
        return;
    const hour = new Date().getHours();
    let greeting;
    if (hour >= 6 && hour < 12) {
        greeting = "Goedemorgen";
    }
    else if (hour < 18) {
        greeting = "Goedemiddag";
    }
    else {
        greeting = "Goedenavond";
    }
    greetingEl.innerHTML = `${greeting}, <span>${name}</span>`;
    const userNameEl = document.getElementById("user-name");
    if (userNameEl && name !== "gebruiker") {
        userNameEl.textContent = name;
    }
}
(async function initGreeting() {
    if (window.spIsLoggedIn?.()) {
        try {
            const me = await window.spotifyGetMe?.();
            if (me && me.display_name) {
                setGreeting(me.display_name);
                return;
            }
        }
        catch (err) {
            console.error("Fout bij ophalen gebruikersnaam:", err);
        }
    }
    setGreeting();
})();
document.querySelectorAll(".mood-chip").forEach((el, idx) => {
    const chip = el;
    chip.addEventListener("click", () => {
        document.querySelectorAll(".mood-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        const mood = chip.dataset.mood || "Focus";
        if (typeof window.updateHeaderMood === "function")
            window.updateHeaderMood(mood);
        saveUserMood(mood);
        const colors = ["#7c5cfc", "#ff6b6b", "#4ecdc4", "#ffe66d", "#ff9ff3"];
        document.documentElement.style.setProperty("--accent", colors[idx % colors.length]);
    });
});
window.updateHeaderMood = function (mood) {
    const textEl = document.getElementById("current-mood-text");
    if (textEl)
        textEl.textContent = mood;
};
async function saveUserMood(mood) {
    await fetch('/api/user/mood', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood })
    });
}
document.getElementById("nav-home")?.addEventListener("click", () => window.showPage("home"));
document.getElementById("nav-zoeken")?.addEventListener("click", () => window.showPage("zoeken"));
document.getElementById("nav-game")?.addEventListener("click", () => window.showPage("game"));
document.getElementById("nav-likes")?.addEventListener("click", () => window.showPage("likes"));
document.getElementById("action-zoek")?.addEventListener("click", () => window.showPage("zoeken"));
document.getElementById("action-likes")?.addEventListener("click", () => window.showPage("likes"));
document.getElementById("nav-new-playlist")?.addEventListener("click", () => {
    if (!window.spIsLoggedIn?.()) {
        window.showCustomModal({
            title: "Inloggen vereist",
            message: "Je moet ingelogd zijn bij Spotify om playlists te maken die bewaard blijven.",
            confirmText: "Login",
            onConfirm: () => {
                window.spotifyLogin?.();
            }
        });
        return;
    }
    window.showCustomModal({
        title: "Nieuwe playlist",
        message: "Geef een naam op voor je nieuwe afspeellijst.",
        showInput: true,
        placeholder: "Bv. og katy perry on top",
        onConfirm: async (name) => {
            if (typeof name === "string" && name.trim()) {
                const playlists = window.getStoredPlaylists();
                if (playlists.some(p => p.name === name)) {
                    window.showCustomModal({
                        title: "Oeps!",
                        message: "Deze playlist bestaat al!",
                    });
                    return;
                }
                const created = await window.createBackendPlaylist(name);
                if (created) {
                    if (typeof window.renderCustomPlaylists === "function")
                        window.renderCustomPlaylists();
                    window.showPage("playlist", name);
                }
            }
        },
    });
});
document.getElementById("delete-playlist-btn")?.addEventListener("click", () => {
    const titleEl = document.getElementById("playlist-title");
    const name = titleEl ? titleEl.textContent : "";
    window.showCustomModal({
        title: "Playlist verwijderen",
        message: `Weet je zeker dat je de playlist '${name}' wilt verwijderen?`,
        confirmText: "Verwijderen",
        isDanger: true,
        onConfirm: async () => {
            const playlists = window.getStoredPlaylists();
            const pl = playlists.find((p) => p.name === name);
            if (pl) {
                await window.deleteBackendPlaylist(pl._id);
            }
            window.showPage("home");
        },
    });
});
document.getElementById("play-likes-btn")?.addEventListener("click", () => {
    const likes = window.getLikes?.() || [];
    if (likes.length === 0)
        return;
    const uris = likes.map((l) => l.uri);
    window.playSong?.(uris, likes[0].meta);
});
document.getElementById("play-playlist-btn")?.addEventListener("click", () => {
    const titleEl = document.getElementById("playlist-title");
    const name = titleEl ? titleEl.textContent : "";
    const playlists = window.getStoredPlaylists();
    const pl = playlists.find(p => p.name === name);
    const tracks = pl ? pl.tracks : [];
    if (tracks.length === 0)
        return;
    const uris = tracks.map(t => t.uri);
    window.playSong?.(uris, tracks[0].meta);
});
const zoekKnop = document.getElementById("zoekKnop");
const zoekVeld = document.getElementById("zoekVeld");
zoekKnop?.addEventListener("click", () => window.handleSearch?.());
zoekVeld?.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
        window.handleSearch?.();
});
const filterAlles = document.getElementById("alles");
const filterArtiesten = document.getElementById("artiesten");
const filterNummer = document.getElementById("nummer");
function updateFilterUI(activeBtn) {
    const filters = [filterAlles, filterArtiesten, filterNummer];
    filters.forEach(f => f?.classList.remove("selected"));
    if (activeBtn)
        activeBtn.classList.add("selected");
}
filterAlles?.addEventListener("click", () => {
    window.zoekInstelling = "artist,track";
    updateFilterUI(filterAlles);
    if (zoekVeld?.value.trim())
        window.handleSearch?.();
});
filterArtiesten?.addEventListener("click", () => {
    window.zoekInstelling = "artist";
    updateFilterUI(filterArtiesten);
    if (zoekVeld?.value.trim())
        window.handleSearch?.();
});
filterNummer?.addEventListener("click", () => {
    window.zoekInstelling = "track";
    updateFilterUI(filterNummer);
    if (zoekVeld?.value.trim())
        window.handleSearch?.();
});
if (typeof window.renderCustomPlaylists === "function")
    window.renderCustomPlaylists();
document.getElementById("now-art")?.addEventListener("click", () => {
    const current = window.getStoredCurrentTrack?.();
    if (current && current.uri)
        window.showDetailPage(current.uri, "track");
});
document.getElementById("now-name")?.addEventListener("click", () => {
    const current = window.getStoredCurrentTrack?.();
    if (current && current.uri)
        window.showDetailPage(current.uri, "track");
});
document.getElementById("now-artist")?.addEventListener("click", () => {
    const current = window.getStoredCurrentTrack?.();
    if (current && current.meta?.artistUri)
        window.showDetailPage(current.meta.artistUri, "artist");
});
let lastGeneratedTracks = [];
document.getElementById("generate-mood-playlist")?.addEventListener("click", async () => {
    const btn = document.getElementById("generate-mood-playlist");
    const resultsContainer = document.getElementById("generator-results");
    const resultsList = document.getElementById("generator-list");
    if (!btn || !resultsContainer || !resultsList)
        return;
    btn.disabled = true;
    btn.textContent = "MAGIE GEBEURT...";
    try {
        const mood = document.querySelector(".mood-chip.selected")?.dataset.mood || "Focus";
        const res = await window.spotifySearch?.(mood, "track");
        lastGeneratedTracks = res?.tracks?.items || [];
        if (lastGeneratedTracks.length === 0) {
            resultsList.innerHTML = '<div class="empty-state">Geen nummers gevonden voor deze mood.</div>';
        }
        else {
            let html = "";
            const likes = window.getLikes?.() || [];
            lastGeneratedTracks.forEach((t) => {
                const isLiked = likes.some((l) => window.getTrackId(l.uri) === window.getTrackId(t.uri));
                html += window.renderTrackRow(t.album.images[0]?.url, t.name, t.artists.map((a) => a.name).join(", "), "Nummer", t.uri, isLiked, t.artists[0]?.uri);
            });
            resultsList.innerHTML = html;
            window.attachRowListeners?.(resultsList);
        }
        resultsContainer.style.display = "block";
        window.showToast?.("Mood playlist gegenereerd!");
    }
    catch (err) {
        console.error("Generator error:", err);
    }
    finally {
        btn.disabled = false;
        btn.textContent = "GENEREER NU";
    }
});
document.getElementById("save-mood-btn")?.addEventListener("click", async () => {
    if (lastGeneratedTracks.length === 0)
        return;
    const mood = document.querySelector(".mood-chip.selected")?.dataset.mood || "Focus";
    const date = new Date().toLocaleDateString("nl-NL");
    const name = `${mood} Mix - ${date}`;
    window.showCustomModal({
        title: "Mood opslaan",
        message: `Wil je deze ${mood} mix opslaan als een nieuwe playlist?`,
        showInput: true,
        placeholder: name,
        onConfirm: async (customName) => {
            const finalName = (typeof customName === "string" && customName.trim()) ? customName : name;
            // Create playlist
            const created = await window.createBackendPlaylist(finalName);
            if (created) {
                const playlists = window.getStoredPlaylists();
                const pl = playlists.find(p => p.name === finalName);
                if (pl) {
                    // Add all tracks
                    const tracksToSave = lastGeneratedTracks.map(t => ({
                        uri: t.uri,
                        id: t.id,
                        meta: {
                            name: t.name,
                            artist: t.artists.map((a) => a.name).join(", "),
                            image: t.album.images[0]?.url,
                            artistUri: t.artists[0]?.uri
                        }
                    }));
                    await fetch(`/api/playlists/${pl._id}/tracks`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tracks: tracksToSave })
                    });
                    // Refresh and show
                    if (typeof window.renderCustomPlaylists === "function")
                        window.renderCustomPlaylists();
                    window.showPage("playlist", finalName);
                }
            }
        }
    });
});
export {};
