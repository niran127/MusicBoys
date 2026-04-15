declare function getTrackId(uri: string): string;
declare function updateLikesPage(): void;
declare function showPlaylist(name: string): void;
declare function initGame(): void;
declare function spotifyGetArtist(id: string): Promise<any>;
declare function spotifyGetArtistTopTracks(id: string): Promise<any>;
declare function spotifyGetArtistAlbums(id: string): Promise<any>;
declare function spotifyGetTrack(id: string): Promise<any>;
declare function getLikes(): any[];
declare function renderTrackRow(img: string, name: string, album: string, type: string, uri: string, isLiked: boolean, artistUri?: string, artistName?: string): string;
declare function attachRowListeners(container: HTMLElement | null): void;
declare function playSong(uris: string | string[], meta: any): Promise<void>;
declare function toggleGlobalLike(uri: string, meta: any): boolean;

let currentPage: string = "home";

function showPage(page: string, playlistName: string | null = null): void {
  const pageHome = document.getElementById("page-home") as HTMLElement;
  const pageZoeken = document.getElementById("page-zoeken") as HTMLElement;
  const pageLikes = document.getElementById("page-likes");
  const pagePlaylist = document.getElementById("page-playlist");
  const pageDetail = document.getElementById("page-detail");
  const pageGame = document.getElementById("page-game");
  
  const navHome = document.getElementById("nav-home") as HTMLElement;
  const navZoeken = document.getElementById("nav-zoeken") as HTMLElement;
  const navLikes = document.getElementById("nav-likes");
  const navGame = document.getElementById("nav-game");

  if (page !== "detail") {
    currentPage = page;
  }

  if (pageHome) pageHome.style.display = "none";
  if (pageZoeken) pageZoeken.style.display = "none";
  if (pageLikes) pageLikes.style.display = "none";
  if (pagePlaylist) pagePlaylist.style.display = "none";
  if (pageDetail) pageDetail.style.display = "none";
  if (pageGame) pageGame.style.display = "none";

  if (navHome) navHome.classList.remove("active");
  if (navZoeken) navZoeken.classList.remove("active");
  if (navLikes) navLikes.classList.remove("active");
  if (navGame) navGame.classList.remove("active");

  document
    .querySelectorAll("#custom-playlists-list .nav-item")
    .forEach((item) => {
      item.classList.remove("active");
    });

  if (page === "home") {
    if (pageHome) pageHome.style.display = "flex";
    if (navHome) navHome.classList.add("active");
  } else if (page === "zoeken") {
    if (pageZoeken) pageZoeken.style.display = "flex";
    if (navZoeken) navZoeken.classList.add("active");
  } else if (page === "likes") {
    if (pageLikes) {
      pageLikes.style.display = "flex";
      if (navLikes) navLikes.classList.add("active");
      if (typeof updateLikesPage === "function") updateLikesPage();
    }
  } else if (page === "playlist" && playlistName) {
    if (pagePlaylist) {
      pagePlaylist.style.display = "flex";
      if (typeof showPlaylist === "function") showPlaylist(playlistName);
    }
  } else if (page === "detail") {
    if (pageDetail) pageDetail.style.display = "flex";
  } else if (page === "game") {
    if (pageGame) {
      pageGame.style.display = "flex";
      if (navGame) navGame.classList.add("active");
      if (typeof initGame === "function") initGame();
    }
  }
}

// detailpagina
async function showDetailPage(uri: string, typeInput?: string): Promise<void> {
  if (!uri) return;
  const pageDetail = document.getElementById("page-detail");
  if (!pageDetail) return;

  const id = getTrackId(uri);
  let type = typeInput;
  if (uri.includes(":artist:")) type = "artist";
  else if (uri.includes(":track:")) type = "track";
  
  showPage("detail");
  pageDetail.innerHTML = `<div class="empty-state">laden...</div>`;
  
  if (type === "artist") {
    await showArtistDetail(id);
  } else {
    await showTrackDetail(id);
  }
}

// artiest detailpagina
async function showArtistDetail(id: string): Promise<void> {
  const pageDetail = document.getElementById("page-detail");
  if (!pageDetail) return;

  try {
    const [info, tracks, albums] = await Promise.all([
      spotifyGetArtist(id),
      spotifyGetArtistTopTracks(id),
      spotifyGetArtistAlbums(id),
    ]);
    const likes = getLikes();
    const checkLiked = (uri: string) =>
      likes.some((l) => getTrackId(l.uri) === getTrackId(uri));
      
    const img = info.images?.[0]?.url || "";
    const genres = info.genres?.join(", ") || "geen genres";
    
    pageDetail.innerHTML = `
      <div class="detail-header artist-header" style="background: linear-gradient(135deg, #333, var(--bg))">
        <button class="detail-close-btn" title="sluiten">&times;</button>
        <div class="detail-header-flex">
          <img src="${img}" class="detail-cover-large artist-cover-circle" alt="${info.name}">
          <div class="detail-header-content">
            <span class="detail-badge">artiest</span>
            <h1 class="detail-title">${info.name}</h1>
            <div class="detail-meta">
              <span>${info.followers?.total?.toLocaleString()} volgers</span>
              <span>·</span>
              <span>populariteit: ${info.popularity}/100</span>
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
          <h3 class="section-subtitle">populaire nummers</h3>
          <div class="tracks-list" id="artist-top-tracks">
            ${
              tracks?.tracks
                ? tracks.tracks
                    .slice(0, 5)
                    .map((t: any) => {
                      const albumImg = t.album?.images?.[0]?.url || "";
                      return renderTrackRow(
                        albumImg,
                        t.name,
                        t.album.name,
                        "Nummer",
                        t.uri,
                        checkLiked(t.uri),
                        info.uri,
                        info.name,
                      );
                    })
                    .join("")
                : '<div class="empty-state">niks gevonden</div>'
            }
          </div>
        </section>
        <section style="margin-top: 48px">
          <h3 class="section-subtitle">albums & singles</h3>
          <div class="albums-grid">
            ${
              albums?.items
                ? albums.items
                    .map(
                      (a: any) => `
              <div class="album-card" data-uri="${a.uri}">
                <div class="album-art-wrap">
                  <img src="${a.images?.[0]?.url || ""}" alt="${a.name}">
                  <div class="album-play-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                </div>
                <div class="album-name">${a.name}</div>
                <div class="album-meta">${a.release_date.split("-")[0]} · ${a.type === "album" ? "album" : "single"}</div>
              </div>
            `,
                    )
                    .join("")
                : '<div class="empty-state">geen albums</div>'
            }
          </div>
        </section>
        <section style="margin-top: 48px">
          <h3 class="section-subtitle">over de artiest</h3>
          <div class="artist-about-card">
            <p><strong>genres:</strong> ${genres}</p>
          </div>
        </section>
      </div>
    `;
    attachRowListeners(document.getElementById("artist-top-tracks"));
    pageDetail
      .querySelector(".play-main-btn")
      ?.addEventListener("click", () => {
        const uris = tracks.tracks.map((t: any) => t.uri);
        playSong(uris, {
          name: info.name,
          artist: "top tracks",
          image: img,
        });
      });
    pageDetail
      .querySelector(".detail-close-btn")
      ?.addEventListener("click", () => {
        showPage(currentPage);
      });
  } catch (err) {
    console.error(err);
    pageDetail.innerHTML = `<div class="empty-state">foutje bij laden.</div>`;
  }
}

// nummer detailpagina
async function showTrackDetail(id: string): Promise<void> {
  const pageDetail = document.getElementById("page-detail");
  if (!pageDetail) return;

  try {
    const track = await spotifyGetTrack(id);
    const img = track.album?.images?.[0]?.url || "";
    const releaseDate = new Date(track.album.release_date).toLocaleDateString(
      "nl-NL",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );
    const durationTotalSecs = Math.floor(track.duration_ms / 1000);
    const m = Math.floor(durationTotalSecs / 60);
    const s = durationTotalSecs % 60;
    const duration = m + ":" + s.toString().padStart(2, "0");
    const likes = getLikes();
    const isLiked = likes.some(
      (l) => getTrackId(l.uri) === getTrackId(track.uri),
    );
    pageDetail.innerHTML = `
      <div class="detail-header track-header" style="background: linear-gradient(135deg, var(--accent), var(--bg))">
        <button class="detail-close-btn" title="sluiten">&times;</button>
        <div class="detail-header-flex">
          <img src="${img}" class="detail-cover-large" alt="${track.name}">
          <div class="detail-header-content">
            <span class="detail-badge">nummer</span>
            <h1 class="detail-title">${track.name}</h1>
            <div class="detail-meta">
              <span class="track-artist-link" data-uri="${track.artists[0].uri}" style="font-weight: 700; cursor: pointer;">${track.artists.map((a: any) => a.name).join(", ")}</span>
              <span>·</span>
              <span>${track.album.name}</span>
              <span>·</span>
              <span>${track.album.release_date.split("-")[0]}</span>
            </div>
            <div class="detail-actions">
              <button class="play-main-btn">AFSPELEN</button>
              <button class="detail-like-btn ${isLiked ? "liked" : ""}" data-uri="${track.uri}">${isLiked ? "geliket" : "like"}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="detail-content">
        <section style="margin-top: 40px">
          <h3 class="section-subtitle">details</h3>
          <div class="track-details-list">
            <div class="detail-item"><span>populariteit</span> <span>${track.popularity}/100</span></div>
            <div class="detail-item"><span>duur</span> <span>${duration}</span></div>
            <div class="detail-item"><span>uitgebracht</span> <span>${releaseDate}</span></div>
            <div class="detail-item"><span>album</span> <span>${track.album.name}</span></div>
          </div>
        </section>
      </div>
    `;
    pageDetail
      .querySelector(".play-main-btn")
      ?.addEventListener("click", () => {
        playSong(track.uri, {
          name: track.name,
          artist: track.artists[0].name,
          artistUri: track.artists[0].uri,
          image: img,
        });
      });
    pageDetail
      .querySelector(".detail-like-btn")
      ?.addEventListener("click", () => {
        toggleGlobalLike(track.uri, {
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(", "),
          artistUri: track.artists[0].uri,
          image: img,
        });
      });
    pageDetail
      .querySelector(".track-artist-link")
      ?.addEventListener("click", (e: any) => {
        const target = e.target.closest(".track-artist-link");
        if (target) {
            showDetailPage(target.dataset.uri, "artist");
        }
      });
    pageDetail
      .querySelector(".detail-close-btn")
      ?.addEventListener("click", () => {
        showPage(currentPage);
      });
  } catch (err) {
    console.error(err);
    pageDetail.innerHTML = `<div class="empty-state">kon nummer niet laden.</div>`;
  }
}
