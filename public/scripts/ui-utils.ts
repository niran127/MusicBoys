declare function getTrackId(uri: string): string;
declare function getStoredCurrentTrack(): any;
declare function updateLikesPage(): void;
declare function getLikes(): any[];
declare function setLikes(likes: any[]): void;
declare function toggleGlobalLike(uri: string, meta: any): boolean;
declare function showPlaylistMenu(e: MouseEvent, data: any): void;
declare function showDetailPage(uri: string, type: string): void;
declare function playSong(uris: string | string[], meta: any): Promise<void>;

function renderTrackRow(
  imageUrl: string | null,
  name: string,
  subtitle: string,
  type: string,
  trackUri: string | null = null,
  isLiked: boolean = false,
  artistUri: string | null = null,
  artistNameMetadata: string | null = null,
): string {
  const eName = name.replace(/"/g, "&quot;");
  const eSub = subtitle.replace(/"/g, "&quot;");
  const eArtistMeta = (artistNameMetadata || subtitle).replace(/"/g, "&quot;");
  const isTrack = type === "Nummer";
  // data voor later gebruik
  const data =
    trackUri && isTrack
      ? `data-uri="${trackUri}" data-name="${eName}" data-artist="${eArtistMeta}" data-image="${imageUrl || ""}" data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ""}`
      : `data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ""}`;
  const playIcon =
    isTrack && trackUri
      ? `
    <div class="play-overlay">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>
  `
      : "";
  return `
    <div class="track-row${isTrack && trackUri ? " playable" : ""}" ${data}>
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
      <button class="track-add-btn" title="aan playlist toevoegen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button class="track-like-btn ${isLiked ? "liked" : ""}" title="like">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
  `;
}
// likes syncen
function syncGlobalLikeUI(uri: string, isLiked: boolean): void {
  if (typeof getTrackId !== "function") return;
  const targetId = getTrackId(uri);
  // rij aanpassen
  document.querySelectorAll(`.track-row[data-uri]`).forEach((el) => {
    const row = el as HTMLElement;
    if (row.dataset.uri && getTrackId(row.dataset.uri) === targetId) {
      const btn = row.querySelector(".track-like-btn");
      if (btn) btn.classList.toggle("liked", isLiked);
    }
  });
  // player bar like
  const current = getStoredCurrentTrack();
  if (current?.uri && getTrackId(current.uri) === targetId) {
    const playerLikeBtn = document.getElementById("like-btn");
    if (playerLikeBtn) playerLikeBtn.classList.toggle("liked", isLiked);
  }
  const pageDetail = document.getElementById("page-detail");
  if (pageDetail) {
    const detailLikeBtn = pageDetail.querySelector(".detail-like-btn") as HTMLElement;
    if (
        detailLikeBtn &&
        detailLikeBtn.dataset.uri &&
        getTrackId(detailLikeBtn.dataset.uri) === targetId
    ) {
        detailLikeBtn.classList.toggle("liked", isLiked);
        detailLikeBtn.textContent = isLiked ? "geliket" : "like";
    }
  }
  const pageLikes = document.getElementById("page-likes");
  if (pageLikes && pageLikes.style.display !== "none") {
    updateLikesPage();
  }
}
// gelikete nummers tonen
function updateLikesPage(): void {
  const container = document.getElementById("likes-resultaten");
  if (!container) return;
  let likes = getLikes();
  // dubbelchecken
  const uniqueLikes: any[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < likes.length; i++) {
    const item = likes[i];
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
    container.innerHTML = `<div class="empty-state">je hebt nog niks geliket.</div>`;
    return;
  }
  let rowsHtml = "";
  for (let i = 0; i < likes.length; i++) {
    const item = likes[i];
    rowsHtml += renderTrackRow(
      item.meta.image,
      item.meta.name,
      item.meta.artist,
      "Nummer",
      item.uri,
      true,
      item.meta.artistUri,
    );
  }
  container.innerHTML = rowsHtml;
  attachRowListeners(container);
}

function attachRowListeners(container: HTMLElement | null): void {
  if (!container) return;
  // likes instellen
  const likeBtns = container.querySelectorAll(".track-like-btn");
  likeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".track-row") as HTMLElement;
      if (!row || !row.dataset.uri) return;
      const isNowLiked = toggleGlobalLike(row.dataset.uri, {
        name: row.dataset.name,
        artist: row.dataset.artist,
        artistUri: row.dataset.artistUri,
        image: row.dataset.image,
      });
      if (isNowLiked) btn.classList.add("liked");
      else btn.classList.remove("liked");
    });
  });
  // playlist menu
  const addBtns = container.querySelectorAll(".track-add-btn");
  addBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".track-row") as HTMLElement;
      if (!row) return;
      if (typeof showPlaylistMenu === "function") {
        showPlaylistMenu(e as MouseEvent, {
          uri: row.dataset.uri,
          meta: {
            name: row.dataset.name,
            artist: row.dataset.artist,
            artistUri: row.dataset.artistUri,
            image: row.dataset.image,
          },
        });
      }
    });
  });
  const rows = container.querySelectorAll(".track-row");
  rows.forEach((el) => {
    const row = el as HTMLElement;
    row.addEventListener("click", (e) => {
      const type = row.dataset.type;
      const uri = row.dataset.uri;
      const target = e.target as HTMLElement;
      // op de titel drukken -> naar detailpagina
      if (target.closest(".track-title-link")) {
        e.stopPropagation();
        if (typeof showDetailPage === "function") {
          showDetailPage((uri || row.dataset.artistUri) || "", "track");
        }
        return;
      }
      if (target.closest(".track-artist-link")) {
        e.stopPropagation();
        const aUri = row.dataset.artistUri;
        if (aUri && typeof showDetailPage === "function") {
          showDetailPage(aUri, "artist");
        }
        return;
      }
      if (
        target.closest(".track-like-btn") ||
        target.closest(".track-add-btn")
      ) {
        return;
      }
      if (type === "Nummer" && uri) {
        const allRows = Array.from(
          container.querySelectorAll(".track-row[data-type='Nummer']"),
        ) as HTMLElement[];
        const startIndex = allRows.indexOf(row);
        const queueUris: string[] = [];
        if (startIndex !== -1) {
          for (let i = startIndex; i < allRows.length; i++) {
            if (allRows[i].dataset.uri) queueUris.push(allRows[i].dataset.uri!);
          }
        } else {
          queueUris.push(uri);
        }
        if (typeof playSong === "function") {
          playSong(queueUris, {
            name: row.dataset.name,
            artist: row.dataset.artist,
            artistUri: row.dataset.artistUri,
            image: row.dataset.image,
          });
        }
        return;
      }
      if (type === "Artiest") {
        if (typeof showDetailPage === "function") {
          showDetailPage((row.dataset.artistUri || uri) || "", "artist");
        }
      }
    });
  });
}
