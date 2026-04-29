export function renderTrackRow(imageUrl, name, subtitle, type, trackUri = null, isLiked = false, artistUri = null, artistNameMetadata = null) {
    const eName = name.replace(/"/g, "&quot;");
    const eSub = subtitle.replace(/"/g, "&quot;");
    const eArtistMeta = (artistNameMetadata || subtitle).replace(/"/g, "&quot;");
    const isTrack = type === "Nummer";
    // data voor later gebruik
    const data = trackUri && isTrack
        ? `data-uri="${trackUri}" data-name="${eName}" data-artist="${eArtistMeta}" data-image="${imageUrl || ""}" data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ""}`
        : `data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ""}`;
    const playIcon = isTrack && trackUri
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
        ${imageUrl
        ? `<img class="track-art" src="${imageUrl}" alt="${name}" onerror="this.style.display='none'">`
        : `<div class="track-art-placeholder">:(</div>`}
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
window.syncGlobalLikeUI = function (uri, isLiked) {
    const targetId = window.getTrackId(uri);
    // rij aanpassen
    document.querySelectorAll(`.track-row[data-uri]`).forEach((el) => {
        const row = el;
        if (window.getTrackId(row.dataset.uri || "") === targetId) {
            const btn = row.querySelector(".track-like-btn");
            if (btn)
                btn.classList.toggle("liked", isLiked);
        }
    });
    // player bar like
    const current = window.getStoredCurrentTrack?.();
    if (current?.uri && window.getTrackId(current.uri) === targetId) {
        const playerLikeBtn = document.getElementById("like-btn");
        if (playerLikeBtn)
            playerLikeBtn.classList.toggle("liked", isLiked);
    }
    const pageDetail = document.getElementById("page-detail");
    const detailLikeBtn = pageDetail?.querySelector(".detail-like-btn");
    if (detailLikeBtn &&
        detailLikeBtn.dataset.uri &&
        window.getTrackId(detailLikeBtn.dataset.uri) === targetId) {
        detailLikeBtn.classList.toggle("liked", isLiked);
        detailLikeBtn.textContent = isLiked ? "geliket" : "like";
    }
    const pageLikes = document.getElementById("page-likes");
    if (pageLikes && pageLikes.style.display !== "none") {
        window.updateLikesPage();
    }
};
window.updateLikesPage = function () {
    const container = document.getElementById("likes-resultaten");
    if (!container)
        return;
    let likes = window.getLikes();
    // dubbelchecken
    const uniqueLikes = [];
    const seenIds = new Set();
    for (let i = 0; i < likes.length; i++) {
        const item = likes[i];
        const id = window.getTrackId(item.uri);
        if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueLikes.push(item);
        }
    }
    if (uniqueLikes.length !== likes.length) {
        likes = uniqueLikes;
        window.setLikes(likes);
    }
    if (likes.length === 0) {
        container.innerHTML = `<div class="empty-state">je hebt nog niks geliket.</div>`;
        return;
    }
    let rowsHtml = "";
    for (let i = 0; i < likes.length; i++) {
        const item = likes[i];
        rowsHtml += renderTrackRow(item.meta.image, item.meta.name, item.meta.artist, "Nummer", item.uri, true, item.meta.artistUri);
    }
    container.innerHTML = rowsHtml;
    attachRowListeners(container);
};
export function attachRowListeners(container) {
    // likes instellen
    const likeBtns = container.querySelectorAll(".track-like-btn");
    likeBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const row = btn.closest(".track-row");
            const isNowLiked = window.toggleGlobalLike(row.dataset.uri, {
                name: row.dataset.name,
                artist: row.dataset.artist,
                artistUri: row.dataset.artistUri,
                image: row.dataset.image,
            });
            if (isNowLiked)
                btn.classList.add("liked");
            else
                btn.classList.remove("liked");
        });
    });
    // playlist menu
    const addBtns = container.querySelectorAll(".track-add-btn");
    addBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const row = btn.closest(".track-row");
            if (typeof window.showPlaylistMenu === "function") {
                window.showPlaylistMenu(e, {
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
        const row = el;
        row.addEventListener("click", (e) => {
            const type = row.dataset.type;
            const uri = row.dataset.uri;
            // op de titel drukken -> naar detailpagina
            if (e.target.closest(".track-title-link")) {
                e.stopPropagation();
                if (typeof window.showDetailPage === "function") {
                    window.showDetailPage(uri || row.dataset.artistUri || "", "track");
                }
                return;
            }
            if (e.target.closest(".track-artist-link")) {
                e.stopPropagation();
                const aUri = row.dataset.artistUri;
                if (aUri && typeof window.showDetailPage === "function") {
                    window.showDetailPage(aUri, "artist");
                }
                return;
            }
            if (e.target.closest(".track-like-btn") ||
                e.target.closest(".track-add-btn")) {
                return;
            }
            if (type === "Nummer" && uri) {
                const allRows = Array.from(container.querySelectorAll(".track-row[data-type='Nummer']"));
                const startIndex = allRows.indexOf(row);
                const queueUris = [];
                if (startIndex !== -1) {
                    for (let i = startIndex; i < allRows.length; i++) {
                        if (allRows[i].dataset.uri)
                            queueUris.push(allRows[i].dataset.uri);
                    }
                }
                else {
                    queueUris.push(uri);
                }
                if (typeof window.playSong === "function") {
                    window.playSong(queueUris, {
                        name: row.dataset.name,
                        artist: row.dataset.artist,
                        artistUri: row.dataset.artistUri,
                        image: row.dataset.image,
                    });
                }
                return;
            }
            if (type === "Artiest") {
                if (typeof window.showDetailPage === "function") {
                    window.showDetailPage(row.dataset.artistUri || uri || "", "artist");
                }
            }
        });
    });
}
export function showCustomModal({ title = "Melding", message = "", placeholder = "Typ hier...", confirmText = "OK", cancelText = "Annuleren", showInput = false, isDanger = false, onConfirm = null, }) {
    const oldModal = document.querySelector(".modal-overlay");
    if (oldModal)
        oldModal.remove();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">${title}</div>
      <div class="modal-message">${message}</div>
      ${showInput ? `<input type="text" class="modal-input" placeholder="${placeholder}" id="modal-input-field">` : ""}
      <div class="modal-actions">
        ${onConfirm ? `<button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">${cancelText}</button>` : ""}
        <button class="modal-btn ${isDanger ? "modal-btn-danger" : "modal-btn-confirm"}" id="modal-confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add("active"), 10);
    const inputEl = overlay.querySelector("#modal-input-field");
    const confirmBtn = overlay.querySelector("#modal-confirm-btn");
    const cancelBtn = overlay.querySelector("#modal-cancel-btn");
    function closeModal() {
        overlay.classList.remove("active");
        setTimeout(() => overlay.remove(), 300);
    }
    if (inputEl) {
        inputEl.focus();
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter")
                confirmBtn.click();
            if (e.key === "Escape") {
                if (cancelBtn)
                    cancelBtn.click();
                else
                    closeModal();
            }
        });
    }
    confirmBtn.addEventListener("click", () => {
        const value = inputEl ? inputEl.value : true;
        if (onConfirm)
            onConfirm(value);
        closeModal();
    });
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            closeModal();
        });
    }
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay)
            closeModal();
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const userPill = document.getElementById("user-pill");
    const userDropdown = document.getElementById("user-dropdown");
    const logoutBtn = document.getElementById("logout-btn");
    if (userPill && userDropdown) {
        userPill.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle("active");
        });
        window.addEventListener("click", () => userDropdown.classList.remove("active"));
    }
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (typeof window.spIsLoggedIn === "function" && window.spIsLoggedIn()) {
                if (typeof window.spotifyLogout === "function")
                    window.spotifyLogout();
            }
            window.location.href = "/logout";
        });
    }
});
window.renderTrackRow = renderTrackRow;
window.attachRowListeners = attachRowListeners;
