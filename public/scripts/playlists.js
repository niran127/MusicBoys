window.renderCustomPlaylists = function() {
  const customPlaylistsList = document.getElementById("custom-playlists-list");
  if (!customPlaylistsList) return;
  const playlists = window.getStoredPlaylists();

  let html = "";
  for (let i = 0; i < playlists.length; i++) {
    const pl = playlists[i];
    html += `
      <div class="nav-item" data-name="${pl.name}" data-id="${pl._id}">
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
      if (typeof showPage === "function") {
        showPage("playlist", item.dataset.name);
      }
    });
  });
}
// playlist inhoud tonen
function showPlaylist(name) {
  const titleEl = document.getElementById("playlist-title");
  const resultsEl = document.getElementById("playlist-resultaten");
  if (!titleEl || !resultsEl) return;
  const playlists = window.getStoredPlaylists();
  const playlist = playlists.find(p => p.name === name);
  const tracks = playlist ? playlist.tracks : [];

  titleEl.textContent = name;
  if (tracks.length === 0) {
    resultsEl.innerHTML = `<div class="empty-state">deze lijst is leeg.</div>`;
  } else {
    const likes = typeof getLikes === "function" ? getLikes() : [];
    let html = "";
    for (let i = 0; i < tracks.length; i++) {
      const item = tracks[i];
      const isLiked = likes.some(l => l.uri === item.uri);
      html += renderTrackRow(
        item.meta.image,
        item.meta.name,
        item.meta.artist,
        "Nummer",
        item.uri,
        isLiked,
        item.meta.artistUri,
      );
    }
    resultsEl.innerHTML = html;
    attachRowListeners(resultsEl);
  }
  // sidebar highlighten
  document
    .querySelectorAll("#custom-playlists-list .nav-item")
    .forEach((item) => {
      if (item.dataset.name === name) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
}
// menu tonen om toe te voegen
function showPlaylistMenu(e, trackData) {
  const oldMenus = document.querySelectorAll(".playlist-menu");
  oldMenus.forEach((m) => m.remove());
  const playlists = window.getStoredPlaylists();
  const activePage = document.getElementById("page-playlist");
  const playlistTitleEl = document.getElementById("playlist-title");
  const currentPlaylistName = playlistTitleEl
    ? playlistTitleEl.textContent
    : "";
  const isOnCurrentPlaylist = activePage && activePage.style.display !== "none";
  const menu = document.createElement("div");
  menu.className = "playlist-menu";
  let menuHtml = `<div class="playlist-menu-header">toevoegen aan:</div>`;
  if (playlists.length === 0) {
    menuHtml += `<div class="playlist-menu-item disabled" style="opacity: 0.5; padding: 8px 12px;">geen playlists</div>`;
  } else {
    for (let i = 0; i < playlists.length; i++) {
        const pl = playlists[i];
        menuHtml += `<div class="playlist-menu-item add" data-name="${pl.name}">${pl.name}</div>`;
    }
  }
  // vw optie
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
      addTrackToPlaylist(item.dataset.name, trackData);
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
    window.addEventListener("click", () => menu.remove(), {
      once: true,
    });
  }, 10);
}
async function addTrackToPlaylist(playlistName, trackData) {
  const playlists = window.getStoredPlaylists();
  const pl = playlists.find(p => p.name === playlistName);
  if (!pl) return;
  
  const targetId = getTrackId(trackData.uri);
  if (pl.tracks.some(t => getTrackId(t.uri) === targetId)) {
    showCustomModal({
      title: "Information",
      message: "This track is already in the playlist!",
    });
    return;
  }
  
  // Update cache
  pl.tracks.push(trackData);
  
  // Sync with backend
  await window.addTrackToBackendPlaylist(pl._id, {
    id: targetId,
    name: trackData.meta.name,
    artist: trackData.meta.artist,
    image: trackData.meta.image,
    uri: trackData.uri
  });
  
  const activePage = document.getElementById("page-playlist");
  const titleEl = document.getElementById("playlist-title");
  if (
    activePage &&
    activePage.style.display !== "none" &&
    titleEl &&
    titleEl.textContent === playlistName
  ) {
    showPlaylist(playlistName);
  }
}

async function removeTrackFromPlaylist(playlistName, trackUri) {
  const playlists = window.getStoredPlaylists();
  const pl = playlists.find(p => p.name === playlistName);
  if (!pl) return;
  
  const targetId = getTrackId(trackUri);
  pl.tracks = pl.tracks.filter(t => getTrackId(t.uri) !== targetId);
  
  // Sync with backend
  await window.removeTrackFromBackendPlaylist(pl._id, targetId);
  
  showPlaylist(playlistName);
}
