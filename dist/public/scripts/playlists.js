let cachedPlaylists = [];
// Initialize playlists from backend
async function fetchAndCachePlaylists() {
    try {
        const res = await fetch('/api/user/playlists');
        if (res.ok) {
            cachedPlaylists = await res.json();
            if (typeof window.renderCustomPlaylists === "function")
                window.renderCustomPlaylists();
        }
    }
    catch (err) {
        console.error("Fout bij ophalen playlists:", err);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    fetchAndCachePlaylists();
});
window.getStoredPlaylists = function () {
    return cachedPlaylists;
};
window.createBackendPlaylist = async function (name) {
    try {
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            const newPlaylist = await res.json();
            // Ensure tracks is an array
            newPlaylist.tracks = newPlaylist.tracks || [];
            cachedPlaylists.push(newPlaylist);
            return true;
        }
    }
    catch (err) {
        console.error("Fout bij aanmaken playlist:", err);
    }
    return false;
};
window.deleteBackendPlaylist = async function (id) {
    try {
        const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cachedPlaylists = cachedPlaylists.filter(p => p._id !== id);
            if (typeof window.renderCustomPlaylists === "function")
                window.renderCustomPlaylists();
        }
    }
    catch (err) {
        console.error("Fout bij verwijderen playlist:", err);
    }
};
window.addTrackToBackendPlaylist = async function (playlistId, track) {
    try {
        const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
            method: 'PATCH', // app.ts uses PATCH for tracks
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ track })
        });
        if (res.ok) {
            const updated = await res.json();
            const idx = cachedPlaylists.findIndex(p => p._id === playlistId);
            if (idx !== -1)
                cachedPlaylists[idx] = updated;
            window.showToast?.("Nummer toegevoegd aan playlist!");
        }
    }
    catch (err) {
        console.error("Fout bij toevoegen track:", err);
    }
};
window.removeTrackFromBackendPlaylist = async function (playlistId, trackId) {
    try {
        const res = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' });
        if (res.ok) {
            const updated = await res.json();
            const idx = cachedPlaylists.findIndex(p => p._id === playlistId);
            if (idx !== -1)
                cachedPlaylists[idx] = updated;
        }
    }
    catch (err) {
        console.error("Fout bij verwijderen track:", err);
    }
};
window.renderCustomPlaylists = function () {
    const customPlaylistsList = document.getElementById("custom-playlists-list");
    if (!customPlaylistsList)
        return;
    const playlists = window.getStoredPlaylists();
    let html = "";
    for (let i = 0; i < playlists.length; i++) {
        const pl = playlists[i];
        html += `
      <div class="nav-item playlist-item" data-name="${pl.name}" data-id="${pl._id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
        ${pl.name}
      </div>
    `;
    }
    customPlaylistsList.innerHTML = html;
    const items = customPlaylistsList.querySelectorAll(".nav-item");
    items.forEach((item) => {
        item.addEventListener("click", () => {
            window.showPage("playlist", item.dataset.name);
        });
    });
};
window.showPlaylist = function (name) {
    const titleEl = document.getElementById("playlist-title");
    const resultsEl = document.getElementById("playlist-resultaten");
    if (!titleEl || !resultsEl)
        return;
    const playlists = window.getStoredPlaylists();
    const playlist = playlists.find(p => p.name === name);
    const tracks = playlist ? playlist.tracks : [];
    titleEl.textContent = name;
    if (tracks.length === 0) {
        resultsEl.innerHTML = `<div class="empty-state">deze lijst is leeg.</div>`;
    }
    else {
        const likes = window.getLikes?.() || [];
        let html = "";
        for (let i = 0; i < tracks.length; i++) {
            const item = tracks[i];
            const isLiked = likes.some((l) => window.getTrackId(l.uri) === window.getTrackId(item.uri));
            html += window.renderTrackRow(item.meta?.image || "", item.meta?.name || "Onbekend", item.meta?.artist || "Onbekend", "Nummer", item.uri, isLiked, item.meta?.artistUri);
        }
        resultsEl.innerHTML = html;
        window.attachRowListeners?.(resultsEl);
    }
    document
        .querySelectorAll("#custom-playlists-list .nav-item")
        .forEach((item) => {
        const hItem = item;
        if (hItem.dataset.name === name) {
            hItem.classList.add("active");
        }
        else {
            hItem.classList.remove("active");
        }
    });
};
window.showPlaylistMenu = function (e, trackData) {
    const oldMenus = document.querySelectorAll(".playlist-menu");
    oldMenus.forEach((m) => m.remove());
    const playlists = window.getStoredPlaylists();
    const activePage = document.getElementById("page-playlist");
    const playlistTitleEl = document.getElementById("playlist-title");
    const currentPlaylistName = playlistTitleEl ? playlistTitleEl.textContent || "" : "";
    const isOnCurrentPlaylist = activePage && activePage.style.display !== "none";
    const menu = document.createElement("div");
    menu.className = "playlist-menu";
    let menuHtml = `<div class="playlist-menu-header">toevoegen aan:</div>`;
    if (playlists.length === 0) {
        menuHtml += `<div class="playlist-menu-item disabled" style="opacity: 0.5; padding: 8px 12px;">geen playlists</div>`;
    }
    else {
        for (let i = 0; i < playlists.length; i++) {
            const pl = playlists[i];
            menuHtml += `<div class="playlist-menu-item add" data-name="${pl.name}">${pl.name}</div>`;
        }
    }
    if (isOnCurrentPlaylist) {
        menuHtml += `
      <div class="playlist-menu-item remove" style="color: #ff4444; border-top: 1px solid #333; margin-top: 5px;">weg uit deze lijst</div>
    `;
    }
    menu.innerHTML = menuHtml;
    document.body.appendChild(menu);
    menu.style.left = e.clientX - 170 + "px";
    menu.style.top = e.clientY + "px";
    const addItems = menu.querySelectorAll(".playlist-menu-item.add");
    addItems.forEach((item) => {
        item.addEventListener("click", () => {
            addTrackToPlaylist(item.dataset.name || "", trackData);
            menu.remove();
        });
    });
    const removeBtn = menu.querySelector(".playlist-menu-item.remove");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            removeTrackFromPlaylist(currentPlaylistName, trackData.uri);
            menu.remove();
        });
    }
    setTimeout(() => {
        window.addEventListener("click", () => menu.remove(), { once: true });
    }, 10);
};
async function addTrackToPlaylist(playlistName, trackData) {
    const playlists = window.getStoredPlaylists();
    const pl = playlists.find(p => p.name === playlistName);
    if (!pl)
        return;
    const targetId = window.getTrackId(trackData.uri);
    if (pl.tracks.some(t => window.getTrackId(t.uri) === targetId)) {
        window.showCustomModal({
            title: "Informatie",
            message: "Dit nummer staat al in de playlist",
        });
        return;
    }
    pl.tracks.push(trackData);
    await window.addTrackToBackendPlaylist(pl._id, {
        id: targetId,
        name: trackData.meta.name,
        artist: trackData.meta.artist,
        image: trackData.meta.image,
        uri: trackData.uri
    });
    const activePage = document.getElementById("page-playlist");
    const titleEl = document.getElementById("playlist-title");
    if (activePage &&
        activePage.style.display !== "none" &&
        titleEl &&
        titleEl.textContent === playlistName) {
        window.showPlaylist?.(playlistName);
    }
}
async function removeTrackFromPlaylist(playlistName, trackUri) {
    const playlists = window.getStoredPlaylists();
    const pl = playlists.find(p => p.name === playlistName);
    if (!pl)
        return;
    const targetId = window.getTrackId(trackUri);
    pl.tracks = pl.tracks.filter(t => window.getTrackId(t.uri) !== targetId);
    await window.removeTrackFromBackendPlaylist(pl._id, targetId);
    window.showPlaylist?.(playlistName);
}
export {};
