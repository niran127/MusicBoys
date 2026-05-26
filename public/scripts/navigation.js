let currentPage = "home";

function showPage(page, playlistName = null) {
  const pageHome = document.getElementById("page-home");
  const pageZoeken = document.getElementById("page-zoeken");
  const pageLikes = document.getElementById("page-likes");
  const pagePlaylist = document.getElementById("page-playlist");
  const pageDetail = document.getElementById("page-detail");
  const pageGame = document.getElementById("page-game");
  const pageCollectie = document.getElementById("page-collectie");

  const navHome = document.getElementById("nav-home");
  const navZoeken = document.getElementById("nav-zoeken");
  const navLikes = document.getElementById("nav-likes");
  const navGame = document.getElementById("nav-game");
  const navCollectie = document.getElementById("nav-collectie");

  if (page !== "detail") {
    currentPage = page;
  }

  if (pageHome) pageHome.style.display = "none";
  if (pageZoeken) pageZoeken.style.display = "none";
  if (pageLikes) pageLikes.style.display = "none";
  if (pagePlaylist) pagePlaylist.style.display = "none";
  if (pageDetail) pageDetail.style.display = "none";
  if (pageGame) pageGame.style.display = "none";
  if (pageCollectie) pageCollectie.style.display = "none";

  if (navHome) navHome.classList.remove("active");
  if (navZoeken) navZoeken.classList.remove("active");
  if (navLikes) navLikes.classList.remove("active");
  if (navGame) navGame.classList.remove("active");
  if (navCollectie) navCollectie.classList.remove("active");

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
  } else if (page === "collectie") {
    if (pageCollectie) {
      pageCollectie.style.display = "flex";
      if (navCollectie) navCollectie.classList.add("active");
      initCollectie();
    }
  }
}

function initCollectie() {
  const tabs = document.querySelectorAll(".collectie-tab");
  tabs.forEach((tab) => {
    tab.onclick = () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.tab;
      document.getElementById("tab-content-playlists").style.display =
        target === "playlists" ? "block" : "none";
      document.getElementById("tab-content-likes").style.display =
        target === "likes" ? "block" : "none";

      if (target === "likes") renderMobileLikes();
      if (target === "playlists") renderMobilePlaylists();
    };
  });
  renderMobilePlaylists();
}

async function renderMobilePlaylists() {
  const list = document.getElementById("mobile-playlists-list");
  if (!list) return;

  try {
    const res = await fetch("/api/user/playlists");
    const playlists = await res.json();

    list.innerHTML = playlists
      .map(
        (p) => `
            <div class="playlist-card-mobile" onclick="showPage('playlist', {id: '${p._id}', name: '${p.name}'})">
                <div class="card-art">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
                <div class="card-info">
                   <div class="card-name">${p.name}</div>
                   <div class="card-count">${p.tracks?.length || 0} nummers</div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

function renderMobileLikes() {
  const list = document.getElementById("mobile-likes-list");
  if (!list) return;

  const likes = getLikes();
  if (likes.length === 0) {
    list.innerHTML = '<div class="empty-state">Geen likes gevonden.</div>';
    return;
  }

  list.innerHTML = likes
    .map((l) =>
      renderTrackRow(
        l.meta.image,
        l.meta.name,
        l.meta.artist,
        "Nummer",
        l.uri,
        true,
        l.meta.artistUri,
      ),
    )
    .join("");
  attachRowListeners(list);
}

// Mobile collection listeners
document
  .getElementById("nav-collectie")
  ?.addEventListener("click", () => showPage("collectie"));
document
  .getElementById("mobile-new-playlist")
  ?.addEventListener("click", () => {
    document.getElementById("nav-new-playlist")?.click();
  });

// details uit player
document.getElementById("now-art")?.addEventListener("click", () => {
  const current = getStoredCurrentTrack();
  if (current && current.uri) showDetailPage(current.uri, "track");
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", () => {
  window.location.href = "/logout";
});

document.addEventListener("DOMContentLoaded", () => {
  initUserDropdown();
  initUserCustomization();
});

function initUserDropdown() {
  const pill = document.getElementById("user-pill");
  const mobileUser = document.querySelector(".mobile-header-user");
  const dropdown = document.getElementById("user-dropdown");

  if (!dropdown) return;

  const toggle = (e) => {
    e.stopPropagation();
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      dropdown.style.position = "fixed";
      dropdown.style.top = "52px";
      dropdown.style.right = "12px";
      dropdown.style.left = "auto";
    } else {
      dropdown.style.position = "absolute";
      dropdown.style.top = "110%";
      dropdown.style.right = "0";
      dropdown.style.left = "auto";
    }
    dropdown.classList.toggle("active");
  };

  pill?.addEventListener("click", toggle);
  mobileUser?.addEventListener("click", toggle);

  document.addEventListener("click", (e) => {
    if (
      !dropdown.contains(e.target) &&
      !pill?.contains(e.target) &&
      !mobileUser?.contains(e.target)
    ) {
      dropdown.classList.remove("active");
    }
  });
}

function initUserCustomization() {
  // Photo upload
  const photoInput = document.getElementById("profile-photo-input");
  const changePhotoBtn = document.getElementById("change-photo-btn");

  changePhotoBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    photoInput?.click();
  });

  photoInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/user/profile-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.profileImageUrl) {
        const avatar = document.getElementById("user-avatar");
        if (avatar) {
          avatar.innerHTML = `<img src="${data.profileImageUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
      }
    } catch (err) {
      console.error("Fout bij uploaden profielfoto:", err);
    }
  });

  // Theme switching
  const themeOpts = document.querySelectorAll(".theme-opt");
  themeOpts.forEach((opt) => {
    opt.addEventListener("click", async (e) => {
      e.stopPropagation();
      const theme = opt.dataset.theme;
      setTheme(theme);

      // Persist to DB
      fetch("/api/user/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
    });
  });
}

function setTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light-theme");
  } else {
    document.documentElement.classList.remove("light-theme");
  }
}

// detailpagina
async function showDetailPage(uri, typeInput) {
  if (!uri) return;
  const pageDetail = document.getElementById("page-detail");
  if (!pageDetail) return;

  const id = window.getTrackId(uri);
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
async function showArtistDetail(id) {
  const pageDetail = document.getElementById("page-detail");
  if (!pageDetail) return;

  try {
    const [info, tracks, albums] = await Promise.all([
      spotifyGetArtist(id),
      spotifyGetArtistTopTracks(id),
      spotifyGetArtistAlbums(id),
    ]);
    const likes = getLikes();
    const checkLiked = (uri) =>
      likes.some((l) => window.getTrackId(l.uri) === window.getTrackId(uri));

    const img = info.images?.[0]?.url || "";
    const genres = info.genres?.join(", ") || "geen genres";

    const followed =
      typeof getFollowedArtists === "function" ? getFollowedArtists() : [];
    const isFollowed = followed.some((a) => a.id === id);

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
              <button class="follow-btn ${isFollowed ? "followed" : ""}">${isFollowed ? "GEVOLGD" : "VOLGEN"}</button>
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
                    .map((t) => {
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
                      (a) => `
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
    // Listeners
    const closeBtn = pageDetail.querySelector(".detail-close-btn");
    if (closeBtn) closeBtn.onclick = () => showPage(currentPage);

    const followBtn = pageDetail.querySelector(".follow-btn");
    if (followBtn) {
      followBtn.onclick = async (e) => {
        const btn = e.target;
        const isCurrentlyFollowed = btn.classList.contains("followed");

        if (isCurrentlyFollowed) return; // Voor nu doen we alleen follow, geen unfollow

        if (typeof spotifyFollowArtist === "function") {
          const ok = await spotifyFollowArtist(id);
          if (ok) {
            btn.textContent = "GEVOLGD";
            btn.classList.add("followed");

            // Lokale cache updaten
            const currentFollowed =
              typeof getFollowedArtists === "function"
                ? getFollowedArtists()
                : [];
            if (!currentFollowed.some((a) => a.id === id)) {
              const newFollowed = [
                ...currentFollowed,
                { id, name: info.name, image: img, uri: info.uri },
              ];
              if (typeof setFollowedArtists === "function")
                setFollowedArtists(newFollowed);
            }
          }
        }
      };
    }

    const playMainBtn = pageDetail.querySelector(".play-main-btn");
    if (playMainBtn) {
      playMainBtn.onclick = () => {
        const topTracksList = tracks?.tracks || [];
        if (topTracksList.length > 0) {
          playSong(
            topTracksList.map((t) => t.uri),
            {
              name: topTracksList[0].name,
              artist: info.name,
              artistUri: info.uri,
              image: topTracksList[0].album?.images?.[0]?.url,
            },
          );
        }
      };
    }

    attachRowListeners(document.getElementById("artist-top-tracks"));

    pageDetail.querySelectorAll(".album-card").forEach((card) => {
      card.onclick = () => {
        const uri = card.dataset.uri;
        if (uri && typeof playSong === "function") {
          playSong(uri, {
            name: card.querySelector(".album-name").textContent,
          });
        }
      };
    });
  } catch (err) {
    console.error(err);
    pageDetail.innerHTML = `<div class="empty-state">foutje bij laden.</div>`;
  }
}

// nummer detailpagina
async function showTrackDetail(id) {
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
      (l) => window.getTrackId(l.uri) === window.getTrackId(track.uri),
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
              <span class="track-artist-link" data-uri="${track.artists[0].uri}" style="font-weight: 700; cursor: pointer;">${track.artists.map((a) => a.name).join(", ")}</span>
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
      ?.addEventListener("click", function () {
        const isNowLiked = toggleGlobalLike(track.uri, {
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          artistUri: track.artists[0].uri,
          image: img,
        });
        this.classList.toggle("liked", isNowLiked);
        this.textContent = isNowLiked ? "geliket" : "like";
      });
    pageDetail
      .querySelector(".track-artist-link")
      ?.addEventListener("click", (e) => {
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
