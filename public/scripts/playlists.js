async function renderCustomPlaylists() {
  const customPlaylistsList = document.getElementById("custom-playlists-list");
  if (!customPlaylistsList) return;

  try {
    const res = await fetch("/api/user/playlists");
    const playlists = await res.json();

    let html = "";
    playlists.forEach((p) => {
      html += `
        <div class="nav-item playlist-item" data-id="${p._id}" data-name="${p.name}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          ${p.name}
        </div>
      `;
    });
    customPlaylistsList.innerHTML = html;

    const items = customPlaylistsList.querySelectorAll(".nav-item");
    items.forEach((item) => {
      item.addEventListener("click", () => {
        if (typeof showPage === "function") {
          showPage("playlist", {
            id: item.dataset.id,
            name: item.dataset.name,
          });
        }
      });
    });
  } catch (err) {
    console.error("Fout bij laden playlists:", err);
  }
}

// playlist inhoud tonen
async function showPlaylist(playlistData) {
  const id = typeof playlistData === "object" ? playlistData.id : null;
  const name =
    typeof playlistData === "object" ? playlistData.name : playlistData;

  const titleEl = document.getElementById("playlist-title");
  const resultsEl = document.getElementById("playlist-resultaten");
  if (!titleEl || !resultsEl) return;

  titleEl.textContent = name;
  resultsEl.innerHTML = `<div class="empty-state">laden...</div>`;

  try {
    const res = await fetch("/api/user/playlists");
    const playlists = await res.json();
    const playlist = playlists.find((p) => p._id === id || p.name === name);

    if (!playlist || !playlist.tracks) {
      resultsEl.innerHTML = `<div class="empty-state">deze lijst is leeg.</div>`;
    } else {
      const likes = typeof getLikes === "function" ? getLikes() : [];
      let html = "";
      playlist.tracks.forEach((item) => {
        const isLiked = likes.some(
          (l) => window.getTrackId(l.uri) === window.getTrackId(item.uri),
        );
        html += renderTrackRow(
          item.meta.image,
          item.meta.name,
          item.meta.artist,
          "Nummer",
          item.uri,
          isLiked,
          item.meta.artistUri,
        );
      });
      resultsEl.innerHTML = html;
      attachRowListeners(resultsEl);
    }

    // Cover art tonen
    const coverImg = document.getElementById("playlist-cover-img");
    const coverPlaceholder = document.getElementById(
      "playlist-cover-placeholder",
    );
    if (coverImg && coverPlaceholder) {
      if (playlist && playlist.coverUrl) {
        coverImg.src = playlist.coverUrl;
        coverImg.style.display = "block";
        coverPlaceholder.style.display = "none";
      } else {
        coverImg.style.display = "none";
        coverPlaceholder.style.display = "flex";
      }
    }

    // sidebar highlighten
    document
      .querySelectorAll("#custom-playlists-list .nav-item")
      .forEach((item) => {
        if (item.dataset.id === id || item.dataset.name === name) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

    // Opslaan van huidige playlist ID voor acties (zoals verwijderen)
    document.getElementById("page-playlist").dataset.currentId = playlist?._id;
  } catch (err) {
    console.error("Fout bij tonen playlist:", err);
    resultsEl.innerHTML = `<div class="empty-state">oepsie...</div>`;
  }
}

// menu tonen om toe te voegen
async function showPlaylistMenu(e, trackData) {
  const oldMenus = document.querySelectorAll(".playlist-menu");
  oldMenus.forEach((m) => m.remove());

  try {
    const res = await fetch("/api/user/playlists");
    const playlists = await res.json();

    const activePage = document.getElementById("page-playlist");
    const currentPlaylistId = activePage ? activePage.dataset.currentId : null;
    const isOnCurrentPlaylist =
      activePage && activePage.style.display !== "none";

    const menu = document.createElement("div");
    menu.className = "playlist-menu";
    let menuHtml = `<div class="playlist-menu-header">toevoegen aan:</div>`;

    if (playlists.length === 0) {
      menuHtml += `<div class="playlist-menu-item disabled" style="opacity: 0.5; padding: 8px 12px;">geen playlists</div>`;
    } else {
      playlists.forEach((p) => {
        menuHtml += `<div class="playlist-menu-item add" data-id="${p._id}">${p.name}</div>`;
      });
    }

    if (isOnCurrentPlaylist && currentPlaylistId) {
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
        addTrackToPlaylist(item.dataset.id, trackData);
        menu.remove();
      });
    });

    const removeBtn = menu.querySelector(".playlist-menu-item.remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        removeTrackFromPlaylist(currentPlaylistId, trackData.uri);
        menu.remove();
      });
    }

    setTimeout(() => {
      const handleOutsideClick = () => {
        menu.remove();
      };
      window.addEventListener("click", handleOutsideClick, { once: true });
    }, 10);
  } catch (err) {
    console.error("Fout bij laden playlist menu:", err);
  }
}

async function addTrackToPlaylist(playlistId, trackData) {
  try {
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track: trackData }),
    });

    if (res.ok) {
      const activePage = document.getElementById("page-playlist");
      if (
        activePage &&
        activePage.style.display !== "none" &&
        activePage.dataset.currentId === playlistId
      ) {
        const titleEl = document.getElementById("playlist-title");
        showPlaylist({
          id: playlistId,
          name: titleEl ? titleEl.textContent : "",
        });
      }
    }
  } catch (err) {
    console.error("Fout bij toevoegen aan playlist:", err);
  }
}

async function removeTrackFromPlaylist(playlistId, trackUri) {
  const trackId = window.getTrackId(trackUri);
  try {
    const res = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      const titleEl = document.getElementById("playlist-title");
      showPlaylist({
        id: playlistId,
        name: titleEl ? titleEl.textContent : "",
      });
    }
  } catch (err) {
    console.error("Fout bij verwijderen uit playlist:", err);
  }
}

// Helper voor custom modal (vervanger voor prompt)
function showCustomPrompt(title, message, initialValue = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("playlist-modal");
    const titleEl = document.getElementById("playlist-modal-title");
    const msgEl = document.getElementById("playlist-modal-message");
    const input = document.getElementById("playlist-name-input");
    const confirmBtn = document.getElementById("playlist-modal-confirm");
    const cancelBtn = document.getElementById("playlist-modal-cancel");

    if (!modal || !input) return resolve(null);

    titleEl.textContent = title;
    msgEl.textContent = message;
    input.value = initialValue;
    confirmBtn.textContent = initialValue ? "OPSLAAN" : "AANMAKEN";

    modal.classList.add("active");
    setTimeout(() => input.focus(), 100);

    const cleanup = () => {
      modal.classList.remove("active");
      confirmBtn.replaceWith(confirmBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      input.replaceWith(input.cloneNode(true));
    };

    const onConfirm = () => {
      const val = document.getElementById("playlist-name-input").value.trim();
      cleanup();
      resolve(val || null);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    document
      .getElementById("playlist-modal-confirm")
      .addEventListener("click", onConfirm);
    document
      .getElementById("playlist-modal-cancel")
      .addEventListener("click", onCancel);
    document
      .getElementById("playlist-name-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") onConfirm();
        if (e.key === "Escape") onCancel();
      });
  });
}

// Global Event Listener voor nieuwe playlist
document
  .getElementById("nav-new-playlist")
  ?.addEventListener("click", async () => {
    const name = await showCustomPrompt(
      "Nieuwe Playlist",
      "Geef een naam op voor je nieuwe afspeellijst.",
    );
    if (name) {
      try {
        const res = await fetch("/api/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description: "" }),
        });
        if (res.status === 409) {
          const data = await res.json();
          showToast(data.error || "Naam is al in gebruik.");
          return;
        }
        if (res.ok) {
          const p = await res.json();
          renderCustomPlaylists();
          showPage("playlist", { id: p._id, name: p.name });
        }
      } catch (err) {
        console.error("Fout bij aanmaken playlist:", err);
      }
    }
  });

// Verwijderen van playlist
document
  .getElementById("delete-playlist-btn")
  ?.addEventListener("click", async () => {
    const activePage = document.getElementById("page-playlist");
    const playlistId = activePage ? activePage.dataset.currentId : null;
    const titleEl = document.getElementById("playlist-title");
    const name = titleEl ? titleEl.textContent : "";

    if (!playlistId) return;
    const confirmed = await showDeleteConfirm(name);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        renderCustomPlaylists();
        showPage("home");
      }
    } catch (err) {
      console.error("Fout bij verwijderen playlist:", err);
    }
  });

// Cover art aanpassen (via local upload)
async function updatePlaylistCover(id, file) {
  const formData = new FormData();
  formData.append("cover", file);

  try {
    const res = await fetch(`/api/playlists/${id}/cover-upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.coverUrl) {
      const img = document.getElementById("playlist-cover-img");
      const placeholder = document.getElementById("playlist-cover-placeholder");
      if (img) {
        img.src = data.coverUrl;
        img.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      }
      // Ook in sidebar of andere plekken updaten indien nodig
      renderCustomPlaylists();
    }
  } catch (err) {
    console.error("Fout bij uploaden cover:", err);
  }
}

// Playlist titel aanpassen
async function updatePlaylistTitle(id, newName) {
  try {
    const res = await fetch(`/api/playlists/${id}/title`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.status === 409) {
      const data = await res.json();
      showToast(data.error || "Naam is al in gebruik.");
      return;
    }
    if (res.ok) {
      const titleEl = document.getElementById("playlist-title");
      if (titleEl) titleEl.textContent = newName;
      renderCustomPlaylists();
      if (typeof renderMobilePlaylists === "function") renderMobilePlaylists();
    }
  } catch (err) {
    console.error("Fout bij updaten titel:", err);
  }
}

// Initialiseer listeners
document
  .getElementById("playlist-cover-input")
  ?.addEventListener("change", function (e) {
    const file = e.target.files[0];
    const playlistId =
      document.getElementById("page-playlist")?.dataset.currentId;
    if (file && playlistId) {
      updatePlaylistCover(playlistId, file);
    }
  });
document
  .getElementById("playlist-title")
  ?.addEventListener("click", async function () {
    const playlistId =
      document.getElementById("page-playlist")?.dataset.currentId;
    const currentName = this.textContent;
    const newName = await showCustomPrompt(
      "Playlist Naam",
      "Pas de naam van je afspeellijst aan.",
      currentName,
    );
    if (newName && newName !== currentName) {
      updatePlaylistTitle(playlistId, newName);
    }
  });

// ── Custom delete confirm modal ────────────────────────────────────────────────
function showDeleteConfirm(playlistName) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-delete-modal");
    const nameEl = document.getElementById("confirm-delete-name");
    const okBtn = document.getElementById("confirm-delete-ok");
    const cancelBtn = document.getElementById("confirm-delete-cancel");
    if (!modal) {
      resolve(false);
      return;
    }
    if (nameEl) nameEl.textContent = playlistName || "deze playlist";
    modal.classList.add("active");

    const cleanup = () => {
      modal.classList.remove("active");
      document
        .getElementById("confirm-delete-ok")
        .replaceWith(
          document.getElementById("confirm-delete-ok").cloneNode(true),
        );
      document
        .getElementById("confirm-delete-cancel")
        .replaceWith(
          document.getElementById("confirm-delete-cancel").cloneNode(true),
        );
    };
    document
      .getElementById("confirm-delete-ok")
      .addEventListener("click", () => {
        cleanup();
        resolve(true);
      });
    document
      .getElementById("confirm-delete-cancel")
      .addEventListener("click", () => {
        cleanup();
        resolve(false);
      });
  });
}

// ── Toast notificatie ────────────────────────────────────────────────────────
function showToast(msg, duration = 3500) {
  let t = document.getElementById("app-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "app-toast";
    t.className = "toast-notification";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("visible");
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove("visible"), duration);
}
