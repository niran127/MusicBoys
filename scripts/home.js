// Greeting functie: bepaald adhv tijd wat de begroeting is
const greetingEl = document.getElementById("greeting");

function setGreeting(name = "gebruiker") {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 12) greeting = "Goedemorgen";
  else if (hour < 18) greeting = "Goedemiddag";
  else greeting = "Goedenavond";
  greetingEl.innerHTML = `${greeting}, <span>${name}</span>`;
}

setGreeting();

// Mood selector
const moods = document.querySelectorAll(".mood-chip");
const sidebarMood = document.getElementById("sidebar-mood");

moods.forEach((mood) => {
  mood.addEventListener("click", () => {
    moods.forEach((m) => m.classList.remove("selected"));
    mood.classList.add("selected");
    sidebarMood.textContent = mood.dataset.mood;
  });
});

// navigatie
const navHome = document.getElementById("nav-home");
const navZoeken = document.getElementById("nav-zoeken");
const navLikes = document.getElementById("nav-likes");
const pageHome = document.getElementById("page-home");
const pageZoeken = document.getElementById("page-zoeken");
const pageLikes = document.getElementById("page-likes");
const pagePlaylist = document.getElementById("page-playlist");
const customPlaylistsList = document.getElementById("custom-playlists-list");
const navNewPlaylist = document.getElementById("nav-new-playlist");
const pageDetail = document.getElementById("page-detail");

let currentPage = "home";

function showPage(page, playlistName = null) {
  if (page !== "detail") currentPage = page;

  pageHome.style.display = "none";
  pageZoeken.style.display = "none";
  pageLikes.style.display = "none";
  pagePlaylist.style.display = "none";
  pageDetail.style.display = "none";
  
  navHome.classList.remove("active");
  navZoeken.classList.remove("active");
  if (navLikes) navLikes.classList.remove("active");
  
  document.querySelectorAll('#custom-playlists-list .nav-item').forEach(item => item.classList.remove('active'));

  if (page === "home") {
    pageHome.style.display = "flex";
    navHome.classList.add("active");
  } else if (page === "zoeken") {
    pageZoeken.style.display = "flex";
    navZoeken.classList.add("active");
  } else if (page === "likes") {
    pageLikes.style.display = "block";
    if (navLikes) navLikes.classList.add("active");
    updateLikesPage();
  } else if (page === "playlist" && playlistName) {
    pagePlaylist.style.display = "block";
    showPlaylist(playlistName);
  } else if (page === "detail") {
    pageDetail.style.display = "block";
  }
}

navHome.addEventListener("click", () => showPage("home"));
navZoeken.addEventListener("click", () => showPage("zoeken"));
if (navLikes) navLikes.addEventListener("click", () => showPage("likes"));

// "zoek muziek" knop verwijst naar zoek pagina
document
  .getElementById("action-zoek")
  .addEventListener("click", () => showPage("zoeken"));

document
  .getElementById("action-likes")
  ?.addEventListener("click", () => showPage("likes"));

// custom playlist func
function renderCustomPlaylists() {
  const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
  customPlaylistsList.innerHTML = Object.keys(playlists).map(name => `
    <div class="nav-item" data-name="${name}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
      ${name}
    </div>
  `).join("");

  customPlaylistsList.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => showPage("playlist", item.dataset.name));
  });
}

navNewPlaylist?.addEventListener("click", () => {
  const name = prompt("Naam van je nieuwe playlist:");
  if (name && name.trim()) {
    const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
    if (playlists[name]) {
      alert("Deze playlist bestaat al!");
      return;
    }
    playlists[name] = [];
    localStorage.setItem("spotify_custom_playlists", JSON.stringify(playlists));
    renderCustomPlaylists();
    showPage("playlist", name);
  }
});

function showPlaylist(name) {
  const titleEl = document.getElementById("playlist-title");
  const resultsEl = document.getElementById("playlist-resultaten");
  const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
  const tracks = playlists[name] || [];

  titleEl.textContent = name;
  if (tracks.length === 0) {
    resultsEl.innerHTML = `<div class="empty-state">Deze playlist is nog leeg.</div>`;
  } else {
    resultsEl.innerHTML = tracks.map(item => {
      return renderTrackRow(item.meta.image, item.meta.name, item.meta.artist, "Nummer", item.uri, true, item.meta.artistUri);
    }).join("");
    attachRowListeners(resultsEl);
  }
  
  document.querySelectorAll('#custom-playlists-list .nav-item').forEach(item => {
    if (item.dataset.name === name) item.classList.add('active');
    else item.classList.remove('active');
  });
}

document.getElementById("delete-playlist-btn")?.addEventListener("click", () => {
  const name = document.getElementById("playlist-title").textContent;
  if (confirm(`Weet je zeker dat je de playlist "${name}" wilt verwijderen?`)) {
    const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
    delete playlists[name];
    localStorage.setItem("spotify_custom_playlists", JSON.stringify(playlists));
    renderCustomPlaylists();
    showPage("home");
  }
});

renderCustomPlaylists();

function getSimilarityScore(text, search) {
  if (text === search) return 100; // Exacte match (hoogste prio)
  if (text.startsWith(search)) return 80; // Begint met de zoekterm
  if (text.includes(search)) return 50; // Zoekterm zit er ergens in

  // Optioneel: geef punten voor kortere namen (relevanter)
  return 0;
}

// zoek filters
const filterAlles = document.getElementById("alles");
const filterArtiesten = document.getElementById("artiesten");
const filterNummer = document.getElementById("nummer");
let zoekInstelling = "artist,track";

filterAlles.addEventListener("click", () => {
  setFilter(filterAlles);
  zoekInstelling = "artist,track";
});
filterArtiesten.addEventListener("click", () => {
  setFilter(filterArtiesten);
  zoekInstelling = "artist";
});
filterNummer.addEventListener("click", () => {
  setFilter(filterNummer);
  zoekInstelling = "track";
});

function setFilter(btn) {
  [filterAlles, filterArtiesten, filterNummer].forEach((b) =>
    b.classList.remove("selected"),
  );
  btn.classList.add("selected");
}

function renderTrackRow(imageUrl, name, subtitle, type, trackUri = null, isLiked = false, artistUri = null, artistNameMetadata = null) {
  const eName = name.replace(/"/g, '&quot;');
  const eSub  = subtitle.replace(/"/g, '&quot;');
  const eArtistMeta = (artistNameMetadata || subtitle).replace(/"/g, '&quot;');
  const isTrack = type === "Nummer";

  const data  = trackUri && isTrack
    ? `data-uri="${trackUri}" data-name="${eName}" data-artist="${eArtistMeta}" data-image="${imageUrl || ''}" data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ''}`
    : `data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ''}`;
  
  const playIcon = isTrack && trackUri ? `
    <div class="play-overlay">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>
  ` : '';

  return `
    <div class="track-row${isTrack && trackUri ? ' playable' : ''}" ${data}>
      <div class="track-art-container">
        ${
          imageUrl
            ? `<img class="track-art" src="${imageUrl}" alt="${name}" onerror="this.style.display='none'">`
            : `<div class="track-art-placeholder">:(</div>`
        }
        ${playIcon}
      </div>
      <div class="track-info">
        <div class="track-name"><span class="track-title-link">${name}</span></div>
        <div class="track-artist"><span class="track-artist-link">${subtitle}</span></div>
      </div>
      <span class="track-type-badge">${type}</span>
      <button class="track-add-btn" title="Aan playlist toevoegen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button class="track-like-btn ${isLiked ? 'liked' : ''}" title="Like">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
  `;
}

// like/unlike functie
function toggleGlobalLike(uri, meta) {
  if (!uri) return false;
  const targetId = getTrackId(uri);
  let likes = getLikes();
  
  const exists = likes.some(l => getTrackId(l.uri) === targetId);
  const isNowLiked = !exists;

  if (exists) {
    likes = likes.filter(l => getTrackId(l.uri) !== targetId);
  } else {
    likes.unshift({ uri, meta });
  }
  setLikes(likes);
  
  // Synchroniseer overal in de UI
  syncGlobalLikeUI(uri, isNowLiked);
  
  return isNowLiked;
}

function syncGlobalLikeUI(uri, isLiked) {
  const targetId = getTrackId(uri);
  
  // 1. alle track rows in de huidige view
  document.querySelectorAll(`.track-row[data-uri]`).forEach(row => {
    if (getTrackId(row.dataset.uri) === targetId) {
      const btn = row.querySelector(".track-like-btn");
      if (btn) btn.classList.toggle("liked", isLiked);
    }
  });

  // 2. de player bar like knop
  const current = getStoredCurrentTrack();
  if (current?.uri && getTrackId(current.uri) === targetId) {
    const playerLikeBtn = document.getElementById("like-btn");
    if (playerLikeBtn) playerLikeBtn.classList.toggle("liked", isLiked);
  }

  // 3. de detail pagina like knop (als die op het scherm is)
  const detailLikeBtn = pageDetail.querySelector(".detail-like-btn");
  if (detailLikeBtn && detailLikeBtn.dataset.uri && getTrackId(detailLikeBtn.dataset.uri) === targetId) {
    detailLikeBtn.classList.toggle("liked", isLiked);
    detailLikeBtn.textContent = isLiked ? "GELIKET" : "LIKE";
  }

  // 4. likes pagina verversen als die open staat
  if (pageLikes.style.display === "block") {
    updateLikesPage();
  }
}

function updateLikesPage() {
  const container = document.getElementById("likes-resultaten");
  if (!container) return;

  let likes = getLikes();
  
  const uniqueLikes = [];
  const seenIds = new Set();
  for (const item of likes) {
    const id = getTrackId(item.uri);
    if (!seenIds.has(id)) {
      seenIds.add(id);
      uniqueLikes.push(item);
    }
  }
  
  if (uniqueLikes.length !== likes.length) {
    likes = uniqueLikes;
    setLikes(likes);
  }
  
  if (likes.length === 0) {
    container.innerHTML = `<div class="empty-state">Je hebt nog geen nummers geliket.</div>`;
    return;
  }

  container.innerHTML = likes.map(item => {
    return renderTrackRow(item.meta.image, item.meta.name, item.meta.artist, "Nummer", item.uri, true, item.meta.artistUri);
  }).join("");

  attachRowListeners(container);
}

function attachRowListeners(container) {
  // like toggle button
  container.querySelectorAll(".track-like-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".track-row");
      const isNowLiked = toggleGlobalLike(row.dataset.uri, {
        name: row.dataset.name,
        artist: row.dataset.artist,
        artistUri: row.dataset.artistUri,
        image: row.dataset.image
      });
      if (isNowLiked) btn.classList.add("liked");
      else btn.classList.remove("liked");
      
      if (document.getElementById("page-likes").style.display === "block") {
        updateLikesPage();
      }
    });
  });

  // toevoegen aan playlist menu
  container.querySelectorAll(".track-add-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".track-row");
      showPlaylistMenu(e, {
        uri: row.dataset.uri,
        meta: {
          name: row.dataset.name,
          artist: row.dataset.artist,
          artistUri: row.dataset.artistUri,
          image: row.dataset.image
        }
      });
    });
  });

// klik acties op een rij
  container.querySelectorAll(".track-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      const type = row.dataset.type;

      if (e.target.closest(".track-title-link") || (type === "Nummer" && !e.target.closest(".track-like-btn") && !e.target.closest(".track-add-btn"))) {
        if (type === "Nummer") {
           const allRows = Array.from(container.querySelectorAll(".track-row[data-type='Nummer']"));
           const startIndex = allRows.indexOf(row);
           const queueUris = allRows.slice(startIndex).map(r => r.dataset.uri).filter(uri => uri);

           playSong(queueUris, {
             name:   row.dataset.name,
             artist: row.dataset.artist,
             artistUri: row.dataset.artistUri,
             image:  row.dataset.image,
           });
        } else {
           showDetailPage(row.dataset.uri || row.dataset.artistUri, 'track');
        }
        return;
      }

      if (e.target.closest(".track-artist-link") || type === "Artiest") {
        e.stopPropagation();
        const aUri = row.dataset.artistUri || (row.dataset.uri?.includes(':artist:') ? row.dataset.uri : null);
        if (aUri) showDetailPage(aUri, 'artist');
        return;
      }
    });
  });
}

function showPlaylistMenu(e, trackData) {
  document.querySelectorAll(".playlist-menu").forEach(m => m.remove());

  const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
  const playlistNames = Object.keys(playlists);
  const activePage = document.getElementById("page-playlist");
  const currentPlaylistName = document.getElementById("playlist-title").textContent;
  const isOnCurrentPlaylist = activePage && activePage.style.display === "block";

  const menu = document.createElement("div");
  menu.className = "playlist-menu";
  let menuHtml = `<div class="playlist-menu-header">Toevoegen aan playlist</div>`;
  
  if (playlistNames.length === 0) {
    menuHtml += `<div class="playlist-menu-item disabled" style="opacity: 0.5; cursor: default;">Geen playlists</div>`;
  } else {
    menuHtml += playlistNames.map(name => `<div class="playlist-menu-item add" data-name="${name}">${name}</div>`).join("");
  }

  if (isOnCurrentPlaylist) {
    menuHtml += `
      <div class="playlist-menu-item remove" style="color: #ff4444;">Verwijder uit deze lijst</div>
    `;
  }

  menu.innerHTML = menuHtml;
  document.body.appendChild(menu);

  menu.style.left = `${e.clientX - 170}px`;
  menu.style.top = `${e.clientY}px`;

  menu.querySelectorAll(".playlist-menu-item.add").forEach(item => {
    item.addEventListener("click", () => {
      addTrackToPlaylist(item.dataset.name, trackData);
      menu.remove();
    });
  });

  menu.querySelector(".playlist-menu-item.remove")?.addEventListener("click", () => {
    removeTrackFromPlaylist(currentPlaylistName, trackData.uri);
    menu.remove();
  });

  setTimeout(() => {
    window.addEventListener("click", () => menu.remove(), { once: true });
  }, 10);
}

function removeTrackFromPlaylist(playlistName, trackUri) {
  const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
  if (!playlists[playlistName]) return;
  const targetId = getTrackId(trackUri);
  playlists[playlistName] = playlists[playlistName].filter(t => getTrackId(t.uri) !== targetId);
  localStorage.setItem("spotify_custom_playlists", JSON.stringify(playlists));
  showPlaylist(playlistName);
}

function addTrackToPlaylist(playlistName, trackData) {
  const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
  if (!playlists[playlistName]) return;

  // voorkom dupes
  const exists = playlists[playlistName].some(t => getTrackId(t.uri) === getTrackId(trackData.uri));
  if (exists) {
    alert("Dit nummer staat al in deze playlist!");
    return;
  }

  playlists[playlistName].push(trackData);
  localStorage.setItem("spotify_custom_playlists", JSON.stringify(playlists));
  
  // reload aangepaste playlist
  const activePage = document.getElementById("page-playlist");
  const title = document.getElementById("playlist-title").textContent;
  if (activePage.style.display === "block" && title === playlistName) {
    showPlaylist(playlistName);
  }
}

// speel 'jouw likes' af
document.getElementById("play-likes-btn")?.addEventListener("click", () => {
  const likes = getLikes();
  if (likes.length === 0) return;
  const uris = likes.map(l => l.uri);
  playSong(uris, likes[0].meta);
});

// speel custom playlist af
document.getElementById("play-playlist-btn")?.addEventListener("click", () => {
  const name = document.getElementById("playlist-title").textContent;
  const playlists = JSON.parse(localStorage.getItem("spotify_custom_playlists") || "{}");
  const tracks = playlists[name] || [];
  if (tracks.length === 0) return;
  const uris = tracks.map(t => t.uri);
  playSong(uris, tracks[0].meta);
});

// zoeken op de zoekpagina
const zoekKnop = document.getElementById("zoekKnop");
const zoekVeld = document.getElementById("zoekVeld");
const resultaten = document.getElementById("resultaten");

zoekVeld.addEventListener("keydown", (e) => {
  if (e.key === "Enter") zoekKnop.click();
});

zoekKnop.addEventListener("click", async () => {
  const query = zoekVeld.value.trim();
  if (!query) return;

  resultaten.innerHTML = `<div class="empty-state">Zoeken...</div>`;

  try {
    const data = await spotifySearch(query, zoekInstelling);
    const likes = getLikes();
    const checkLiked = (uri) => likes.some(l => getTrackId(l.uri) === getTrackId(uri));

    if (zoekInstelling === "artist") {
      resultaten.innerHTML =
        data.artists.items
          .map((el) => {
            const img = el.images?.[0]?.url || null;
            return renderTrackRow(
              img,
              el.name,
              `Artiest · ${el.followers?.total?.toLocaleString() ?? 0} volgers`,
              "Artiest",
              null, // trackUri moet null zijn voor een artiest!
              false,
              el.uri, // artistUri
              el.name // artistNameMetadata
            );
          })
          .join("") ||
        `<div class="empty-state">Geen resultaten gevonden</div>`;
    } else if (zoekInstelling === "track") {
      resultaten.innerHTML =
        data.tracks.items
          .map((el) => {
            const img = el.album?.images?.[0]?.url || null;
            const artists = el.artists.map((a) => a.name).join(", ");
            const firstArtistUri = el.artists[0]?.uri || null;
            return renderTrackRow(img, el.name, artists, "Nummer", el.uri, checkLiked(el.uri), firstArtistUri, artists);
          })
          .join("") ||
        `<div class="empty-state">Geen resultaten gevonden</div>`;
    } else {
      const allItems = [
        ...(data.artists?.items || []),
        ...(data.tracks?.items || []),
      ];

      allItems.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        const q = query.toLowerCase();
        const scoreA = getSimilarityScore(nameA, q);
        const scoreB = getSimilarityScore(nameB, q);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.popularity || 0) - (a.popularity || 0);
      });

      resultaten.innerHTML =
        allItems
          .slice(0, 8)
          .map((el) => {
            if (el.type === "artist") {
              const img = el.images?.[0]?.url || null;
                return renderTrackRow(img, el.name, "Artiest", "Artiest", null, false, el.uri);
            } else {
              const img = el.album?.images?.[0]?.url || null;
              const artists = el.artists.map((a) => a.name).join(", ");
              const firstArtistUri = el.artists[0]?.uri || null;
              return renderTrackRow(img, el.name, artists, "Nummer", el.uri, checkLiked(el.uri), firstArtistUri, artists);
            }
          })
          .join("") ||
        `<div class="empty-state">Geen resultaten gevonden</div>`;
    }

    attachRowListeners(resultaten);

  } catch (err) {
    console.error(err);
    resultaten.innerHTML = `<div class="empty-state">Oeps, er ging iets mis...</div>`;
  }
});

// detail paginas tonen
async function showDetailPage(uri, typeInput) {
  if (!uri) return;
  const id = getTrackId(uri);
  
  let type = typeInput;
  if (uri.includes(':artist:')) type = 'artist';
  else if (uri.includes(':track:')) type = 'track';

  showPage("detail");
  pageDetail.innerHTML = `<div class="empty-state">Laden...</div>`;

  if (type === 'artist') {
    await showArtistDetail(id);
  } else {
    await showTrackDetail(id);
  }
}

async function showArtistDetail(id) {
  try {
    const [info, tracks, albums] = await Promise.all([
      spotifyGetArtist(id),
      spotifyGetArtistTopTracks(id),
      spotifyGetArtistAlbums(id)
    ]);

    const likes = getLikes();
    const checkLiked = (uri) => likes.some(l => getTrackId(l.uri) === getTrackId(uri));

    const img = info.images?.[0]?.url || "";
    const genres = info.genres?.join(", ") || "Geen genres bekend";
    
    pageDetail.innerHTML = `
      <div class="detail-header artist-header" style="background: linear-gradient(135deg, #333, var(--bg))">
        <button class="detail-close-btn" title="Sluiten">&times;</button>
        <div class="detail-header-flex">
          <img src="${img}" class="detail-cover-large artist-cover-circle" alt="${info.name}">
          <div class="detail-header-content">
            <span class="detail-badge">Artiest</span>
            <h1 class="detail-title">${info.name}</h1>
            <div class="detail-meta">
              <span>${info.followers?.total?.toLocaleString()} volgers</span>
              <span>·</span>
              <span>Populariteit: ${info.popularity}/100</span>
            </div>
            <div class="detail-actions">
              <button class="play-main-btn">AFSPELEN</button>
              <button class="follow-btn">VOLGEN</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="detail-content">
        <section>
          <h3 class="section-subtitle">Populaire nummers</h3>
          <div class="tracks-list" id="artist-top-tracks">
            ${tracks?.tracks ? tracks.tracks.slice(0, 5).map(t => {
              const albumImg = t.album?.images?.[0]?.url || "";
              // album toont op detailpagina, artiestnaam opgeslagen voor playlist info
              return renderTrackRow(albumImg, t.name, t.album.name, "Nummer", t.uri, checkLiked(t.uri), info.uri, info.name);
            }).join("") : '<div class="empty-state">Geen nummers gevonden</div>'}
          </div>
        </section>

        <section style="margin-top: 48px">
          <h3 class="section-subtitle">Albums & Singles</h3>
          <div class="albums-grid">
            ${albums?.items ? albums.items.map(a => `
              <div class="album-card" data-uri="${a.uri}">
                <div class="album-art-wrap">
                  <img src="${a.images?.[0]?.url || ''}" alt="${a.name}">
                  <div class="album-play-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                </div>
                <div class="album-name">${a.name}</div>
                <div class="album-meta">${a.release_date.split("-")[0]} · ${a.type === 'album' ? 'Album' : 'Single'}</div>
              </div>
            `).join("") : '<div class="empty-state">Geen albums gevonden</div>'}
          </div>
        </section>

        <section style="margin-top: 48px">
          <h3 class="section-subtitle">Over de artiest</h3>
          <div class="artist-about-card">
            <p><strong>Genres:</strong> ${genres}</p>
          </div>
        </section>
      </div>
    `;

    attachRowListeners(document.getElementById("artist-top-tracks"));
    

    
    pageDetail.querySelector(".play-main-btn")?.addEventListener("click", () => {
      const uris = tracks.tracks.map(t => t.uri);
      playSong(uris, { name: info.name, artist: "Top Tracks", image: img });
    });

    pageDetail.querySelector(".detail-close-btn")?.addEventListener("click", () => {
      showPage(currentPage);
    });

  } catch (err) {
    console.error(err);
    pageDetail.innerHTML = `<div class="empty-state">Kon artiestgegevens niet laden.</div>`;
  }
}

async function showTrackDetail(id) {
  try {
    const track = await spotifyGetTrack(id);

    const img = track.album?.images?.[0]?.url || "";
    const releaseDate = new Date(track.album.release_date).toLocaleDateString("nl-NL", { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    const duration = Math.floor(track.duration_ms / 60000) + ":" + ((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0');



    const likes = getLikes();
    const isLiked = likes.some(l => getTrackId(l.uri) === getTrackId(track.uri));

    pageDetail.innerHTML = `
      <div class="detail-header track-header" style="background: linear-gradient(135deg, var(--accent), var(--bg))">
        <button class="detail-close-btn" title="Sluiten">&times;</button>
        <div class="detail-header-flex">
          <img src="${img}" class="detail-cover-large" alt="${track.name}">
          <div class="detail-header-content">
            <span class="detail-badge">Nummer</span>
            <h1 class="detail-title">${track.name}</h1>
            <div class="detail-meta">
              <span class="track-artist-link" data-uri="${track.artists[0].uri}" style="font-weight: 700; cursor: pointer;">${track.artists.map(a => a.name).join(", ")}</span>
              <span>·</span>
              <span>${track.album.name}</span>
              <span>·</span>
              <span>${track.album.release_date.split("-")[0]}</span>
            </div>
            <div class="detail-actions">
              <button class="play-main-btn">AFSPELEN</button>
              <button class="detail-like-btn ${isLiked ? 'liked' : ''}" data-uri="${track.uri}">${isLiked ? 'GELIKET' : 'LIKE'}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-content">

        <section style="margin-top: 40px">
          <h3 class="section-subtitle">Details</h3>
          <div class="track-details-list">
            <div class="detail-item"><span>Populariteit</span> <span>${track.popularity}/100</span></div>
            <div class="detail-item"><span>Duur</span> <span>${duration}</span></div>
            <div class="detail-item"><span>Uitgebracht</span> <span>${releaseDate}</span></div>
            <div class="detail-item"><span>Album</span> <span>${track.album.name}</span></div>
          </div>
        </section>
      </div>
    `;

    pageDetail.querySelector(".play-main-btn")?.addEventListener("click", () => {
      playSong(track.uri, { name: track.name, artist: track.artists[0].name, artistUri: track.artists[0].uri, image: img });
    });

    pageDetail.querySelector(".detail-like-btn")?.addEventListener("click", () => {
      toggleGlobalLike(track.uri, {
        name: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        artistUri: track.artists[0].uri,
        image: img
      });
    });

    pageDetail.querySelector(".track-artist-link")?.addEventListener("click", (e) => {
      showDetailPage(e.target.dataset.uri, 'artist');
    });

    pageDetail.querySelector(".detail-close-btn")?.addEventListener("click", () => {
      showPage(currentPage);
    });

  } catch (err) {
    console.error(err);
    pageDetail.innerHTML = `<div class="empty-state">Kon nummergegevens niet laden.</div>`;
  }
}

// detail navigatie vanuit de player bar
document.getElementById("now-art")?.addEventListener("click", () => {
  const current = getStoredCurrentTrack();
  if (current.uri) showDetailPage(current.uri, 'track');
});

document.getElementById("now-name")?.addEventListener("click", () => {
  const current = getStoredCurrentTrack();
  if (current.uri) showDetailPage(current.uri, 'track');
});

document.getElementById("now-artist")?.addEventListener("click", (e) => {
  const current = getStoredCurrentTrack();
  const artistEl = e.currentTarget;
  const datasetUri = artistEl.dataset.uri;

  if (datasetUri) {
    showDetailPage(datasetUri, 'artist');
  } else if (current.meta?.artistUri) {
    showDetailPage(current.meta.artistUri, 'artist');
  } else if (current.uri && current.uri.includes(':artist:')) {
    showDetailPage(current.uri, 'artist');
  }
});
