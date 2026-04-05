function renderCustomPlaylists() {
  const customPlaylistsList = document.getElementById("custom-playlists-list");
  if (!customPlaylistsList) return;
  const rawData = localStorage.getItem("spotify_custom_playlists");
  const playlists = JSON.parse(rawData || "{}");
  let html = "";
  const names = Object.keys(playlists);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    html += `
      <div class="nav-item" data-name="${name}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
        ${name}
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
  const rawData = localStorage.getItem("spotify_custom_playlists");
  const playlists = JSON.parse(rawData || "{}");
  const tracks = playlists[name] || [];
  titleEl.textContent = name;
  if (tracks.length === 0) {
    resultsEl.innerHTML = `<div class="empty-state">deze lijst is leeg.</div>`;
  } else {
    let html = "";
    for (let i = 0; i < tracks.length; i++) {
      const item = tracks[i];
      html += renderTrackRow(
        item.meta.image,
        item.meta.name,
        item.meta.artist,
        "Nummer",
        item.uri,
        true,
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
  const rawData = localStorage.getItem("spotify_custom_playlists");
  const playlists = JSON.parse(rawData || "{}");
  const playlistNames = Object.keys(playlists);
  const activePage = document.getElementById("page-playlist");
  const playlistTitleEl = document.getElementById("playlist-title");
  const currentPlaylistName = playlistTitleEl
    ? playlistTitleEl.textContent
    : "";
  const isOnCurrentPlaylist = activePage && activePage.style.display !== "none";
  const menu = document.createElement("div");
  menu.className = "playlist-menu";
  let menuHtml = `<div class="playlist-menu-header">toevoegen aan:</div>`;
  if (playlistNames.length === 0) {
    menuHtml += `<div class="playlist-menu-item disabled" style="opacity: 0.5; padding: 8px 12px;">geen playlists</div>`;
  } else {
    for (let i = 0; i < playlistNames.length; i++) {
      const name = playlistNames[i];
      menuHtml += `<div class="playlist-menu-item add" data-name="${name}">${name}</div>`;
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
function addTrackToPlaylist(playlistName, trackData) {
  const rawData = localStorage.getItem("spotify_custom_playlists");
  const playlists = JSON.parse(rawData || "{}");
  if (!playlists[playlistName]) return;
  let exists = false;
  for (let i = 0; i < playlists[playlistName].length; i++) {
    if (
      getTrackId(playlists[playlistName][i].uri) === getTrackId(trackData.uri)
    ) {
      exists = true;
      break;
    }
  }
  if (exists) {
    alert("staat er al in!");
    return;
  }
  playlists[playlistName].push(trackData);
  localStorage.setItem("spotify_custom_playlists", JSON.stringify(playlists));
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
function removeTrackFromPlaylist(playlistName, trackUri) {
  const rawData = localStorage.getItem("spotify_custom_playlists");
  const playlists = JSON.parse(rawData || "{}");
  if (!playlists[playlistName]) return;
  const targetId = getTrackId(trackUri);
  const newTracks = [];
  for (let i = 0; i < playlists[playlistName].length; i++) {
    if (getTrackId(playlists[playlistName][i].uri) !== targetId) {
      newTracks.push(playlists[playlistName][i]);
    }
  }
  playlists[playlistName] = newTracks;
  localStorage.setItem("spotify_custom_playlists", JSON.stringify(playlists));
  showPlaylist(playlistName);
}
