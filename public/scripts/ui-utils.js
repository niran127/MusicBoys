function renderTrackRow(
  imageUrl,
  name,
  subtitle,
  type,
  trackUri = null,
  isLiked = false,
  artistUri = null,
  artistNameMetadata = null,
) {
  const eName = name.replace(/"/g, "&quot;");
  const eSub = subtitle.replace(/"/g, "&quot;");
  const eArtistMeta = (artistNameMetadata || subtitle).replace(/"/g, "&quot;");
  const isTrack = !!trackUri; // Elke rij met een trackUri is een nummer
  // data voor later gebruik
  let data = `data-type="${type}" ${artistUri ? `data-artist-uri="${artistUri}"` : ""}`;
  if (trackUri) {
      data += ` data-uri="${trackUri}" data-name="${eName}" data-artist="${eArtistMeta}" data-image="${imageUrl || ""}"`;
  }
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
window.syncGlobalLikeUI = function(uri, isLiked) {
  if (typeof getTrackId !== "function") return;
  const targetId = getTrackId(uri);
  // rij aanpassen
  document.querySelectorAll(`.track-row[data-uri]`).forEach((row) => {
    if (getTrackId(row.dataset.uri) === targetId) {
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
  const detailLikeBtn = pageDetail.querySelector(".detail-like-btn");
  if (
    detailLikeBtn &&
    detailLikeBtn.dataset.uri &&
    getTrackId(detailLikeBtn.dataset.uri) === targetId
  ) {
    detailLikeBtn.classList.toggle("liked", isLiked);
    detailLikeBtn.textContent = isLiked ? "geliket" : "like";
  }
  const pageLikes = document.getElementById("page-likes");
  if (pageLikes && pageLikes.style.display !== "none") {
    updateLikesPage();
  }
}
// gelikete nummers tonen
window.updateLikesPage = function() {
  const container = document.getElementById("likes-resultaten");
  if (!container) return;
  
  let likes = getLikes();
  
  // default recent sort
  likes.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));

  // Expanded Filter to check both artist and track name
  const filterText = document.getElementById("likes-artist-filter")?.value?.toLowerCase() || "";
  if (filterText) {
    likes = likes.filter(l => 
      l.meta.artist.toLowerCase().includes(filterText) || 
      l.meta.name.toLowerCase().includes(filterText)
    );
  }

  if (likes.length === 0) {
    container.innerHTML = `<div class="empty-state">Geen resultaten gevonden.</div>`;
    return;
  }

  let rowsHtml = "";
  for (let i = 0; i < likes.length; i++) {
    const item = likes[i];
    const dateStr = item.dateAdded ? new Date(item.dateAdded).toLocaleDateString('nl-NL') : "Nummer";

    rowsHtml += renderTrackRow(
      item.meta.image,
      item.meta.name,
      item.meta.artist,
      dateStr,
      item.uri,
      true,
      item.meta.artistUri
    );
  }
  container.innerHTML = rowsHtml;
  attachRowListeners(container);
};

// Event listeners for controls
document.getElementById("likes-artist-filter")?.addEventListener("input", () => window.updateLikesPage());

window.showToast = function(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.classList.add('visible');
  
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
};

function attachRowListeners(container) {
  // likes instellen
  const likeBtns = container.querySelectorAll(".track-like-btn");
  likeBtns.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const row = btn.closest(".track-row");
      await window.toggleGlobalLike(row.dataset.uri, {
        name: row.dataset.name,
        artist: row.dataset.artist,
        artistUri: row.dataset.artistUri,
        image: row.dataset.image,
      });
    });
  });
  // playlist menu
  const addBtns = container.querySelectorAll(".track-add-btn");
  addBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".track-row");
      if (typeof showPlaylistMenu === "function") {
        showPlaylistMenu(e, {
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
  rows.forEach((row) => {
    row.addEventListener("click", (e) => {
      const type = row.dataset.type;
      const uri = row.dataset.uri;
      // op de titel drukken -> naar detailpagina
      if (e.target.closest(".track-title-link")) {
        e.stopPropagation();
        if (typeof showDetailPage === "function") {
          showDetailPage(uri || row.dataset.artistUri, "track");
        }
        return;
      }
      if (e.target.closest(".track-artist-link")) {
        e.stopPropagation();
        const aUri = row.dataset.artistUri;
        if (aUri && typeof showDetailPage === "function") {
          showDetailPage(aUri, "artist");
        }
        return;
      }
      if (
        e.target.closest(".track-like-btn") ||
        e.target.closest(".track-add-btn")
      ) {
        return;
      }
      const typeLabel = row.dataset.type;
      if (uri && (typeLabel === "Nummer" || row.querySelector('.track-like-btn'))) {
        const allRows = Array.from(
          container.querySelectorAll(".track-row[data-uri]")
        );
        
        // Build global queue with metadata for Prev/Next sync
        window.playbackQueue = allRows.map(r => ({
           uri: r.dataset.uri,
           meta: {
               name: r.dataset.name,
               artist: r.dataset.artist,
               image: r.dataset.image,
               artistUri: r.dataset.artistUri
           }
        }));
        window.currentQueueIndex = window.playbackQueue.findIndex(item => item.uri === uri);

        if (typeof playSong === "function") {
          playSong(uri, {
            name: row.dataset.name,
            artist: row.dataset.artist,
            artistUri: row.dataset.artistUri,
            image: row.dataset.image,
          });
        }
        return;
      }
      if (typeLabel === "Artiest") {
        if (typeof showDetailPage === "function") {
          showDetailPage(row.dataset.artistUri || uri, "artist");
        }
      }
    });
  });
}

/**
 * Toont een custom modal in plaats van browser native popups
 * @param {Object} options - { title, message, placeholder, confirmText, cancelText, showInput, isDanger, onConfirm }
 */
function showCustomModal({
  title = "Melding",
  message = "",
  placeholder = "Typ hier...",
  confirmText = "OK",
  cancelText = "Annuleren",
  showInput = false,
  isDanger = false,
  onConfirm = null,
}) {
  // Verwijder oude modal als die er nog is
  const oldModal = document.querySelector(".modal-overlay");
  if (oldModal) oldModal.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">${title}</div>
      <div class="modal-message">${message}</div>
      ${showInput ? `<input type="text" class="modal-input" placeholder="${placeholder}" id="modal-input-field" autocomplete="off">` : ""}
      <div class="modal-actions">
        ${onConfirm ? `<button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">${cancelText}</button>` : ""}
        <button class="modal-btn ${isDanger ? "modal-btn-danger" : "modal-btn-confirm"}" id="modal-confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Vrijwel direct activeren voor de transitie
  setTimeout(() => overlay.classList.add("active"), 10);

  const inputEl = overlay.querySelector("#modal-input-field");
  const confirmBtn = overlay.querySelector("#modal-confirm-btn");
  const cancelBtn = overlay.querySelector("#modal-cancel-btn");

  if (inputEl) {
    inputEl.focus();
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmBtn.click();
      if (e.key === "Escape") if (cancelBtn) cancelBtn.click(); else closeModal();
    });
  }

  function closeModal() {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 300);
  }

  confirmBtn.addEventListener("click", () => {
    const value = inputEl ? inputEl.value : true;
    if (onConfirm) onConfirm(value);
    closeModal();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeModal();
    });
  }

  // Klikken buiten de modal om te sluiten
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}

// User Dropdown Logica
document.addEventListener("DOMContentLoaded", () => {
    const userPill = document.getElementById("user-pill");
    const userDropdown = document.getElementById("user-dropdown");
    const logoutBtn = document.getElementById("logout-btn");

    if (userPill && userDropdown) {
        userPill.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle("active");
        });

        // Sluiten bij klikken buiten dropdown
        window.addEventListener("click", () => {
            userDropdown.classList.remove("active");
        });
    }

    if (logoutBtn) {
        const loggedIn = typeof spIsLoggedIn === "function" ? spIsLoggedIn() : false;
        
        if (!loggedIn) {
            logoutBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.306c-.215.354-.675.467-1.03.249-2.862-1.748-6.465-2.144-10.707-1.177-.406.092-.817-.16-.909-.567-.092-.403.161-.815.567-.908 4.647-1.062 8.624-.616 11.83 1.341.355.213.467.675.249 1.03zm1.468-3.26c-.272.44-.847.579-1.287.308-3.277-2.013-8.274-2.598-12.151-1.421-.497.151-1.023-.129-1.173-.626-.15-.497.13-.1.023-.627 4.316-1.31 9.817-.655 13.593 1.666.44.271.58.845.308 1.287zm.126-3.41c-3.928-2.333-10.414-2.55-14.177-1.407-.604.183-1.246-.164-1.428-.767-.183-.604.164-1.246.767-1.428 4.321-1.312 11.487-1.059 16.002 1.62.544.323.72 1.033.398 1.577-.323.544-1.032.721-1.577.398z"/>
                </svg>
                <span>Login Spotify</span>
            `;
            logoutBtn.style.color = "var(--text)";
        }

        logoutBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (loggedIn) {
                // Clear spotify locally and redirect to server logout
                if (typeof spotifyLogout === "function") spotifyLogout(false);
                window.location.href = '/logout';
            } else {
                if (typeof spotifyLogin === "function") spotifyLogin();
            }
        });
    }
});
