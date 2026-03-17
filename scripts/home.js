// Greeting functie: bepaald adhv tijd wat de begroeting is
const greetingEl = document.getElementById("greeting");

function setGreeting(name = "gebruiker") {
  if (!greetingEl) return;
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 6 && hour < 12) {
    greeting = "Goedemorgen";
  } else if (hour < 18) {
    greeting = "Goedemiddag";
  } else {
    greeting = "Goedenavond";
  }
  greetingEl.innerHTML = `${greeting}, <span>${name}</span>`; // naam veranderd in userpill
  const userNameEl = document.getElementById("user-name");
  if (userNameEl && name !== "gebruiker") {
    userNameEl.textContent = name;
  }
}
// naam ophalen van spotify
(async function initGreeting() {
  if (typeof spIsLoggedIn === "function" && spIsLoggedIn()) {
    try {
      const me = await spotifyGetMe();
      if (me && me.display_name) {
        setGreeting(me.display_name);
        return;
      }
    } catch (err) {
      console.error("Fout bij ophalen gebruikersnaam:", err);
    }
  }
  setGreeting();
})();
// Mood selector
const moods = document.querySelectorAll(".mood-chip");
const sidebarMood = document.getElementById("sidebar-mood");
for (let i = 0; i < moods.length; i++) {
  moods[i].addEventListener("click", function () {
    for (let j = 0; j < moods.length; j++) {
      moods[j].classList.remove("selected");
    }
    this.classList.add("selected");
    if (sidebarMood) {
      sidebarMood.textContent = this.dataset.mood;
    }
  });
}
// navigatie
document
  .getElementById("nav-home")
  ?.addEventListener("click", () => showPage("home"));
document
  .getElementById("nav-zoeken")
  ?.addEventListener("click", () => showPage("zoeken"));
document
  .getElementById("nav-likes")
  ?.addEventListener("click", () => showPage("likes"));
document
  .getElementById("action-zoek")
  ?.addEventListener("click", () => showPage("zoeken"));
document
  .getElementById("action-likes")
  ?.addEventListener("click", () => showPage("likes"));
// nieuwe playlist
document.getElementById("nav-new-playlist")?.addEventListener("click", () => {
  const name = prompt("Naam van je nieuwe playlist:");
  if (name && name.trim()) {
    const rawData = localStorage.getItem("spotify_custom_playlists");
    const playlists = JSON.parse(rawData || "{}");
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
// playlist verwijderen
document
  .getElementById("delete-playlist-btn")
  ?.addEventListener("click", () => {
    const titleEl = document.getElementById("playlist-title");
    const name = titleEl ? titleEl.textContent : "";
    if (
      confirm(
        "Weet je zeker dat je de playlist '" + name + "' wilt verwijderen?",
      )
    ) {
      const rawData = localStorage.getItem("spotify_custom_playlists");
      const playlists = JSON.parse(rawData || "{}");
      delete playlists[name];
      localStorage.setItem(
        "spotify_custom_playlists",
        JSON.stringify(playlists),
      );
      renderCustomPlaylists();
      showPage("home");
    }
  });

function toggleGlobalLike(uri, meta) {
  if (!uri) return false;
  const targetId = getTrackId(uri);
  let likes = getLikes();
  let foundIndex = -1;
  for (let i = 0; i < likes.length; i++) {
    if (getTrackId(likes[i].uri) === targetId) {
      foundIndex = i;
      break;
    }
  }
  const isNowLiked = foundIndex === -1;
  if (foundIndex !== -1) {
    const newLikes = [];
    for (let i = 0; i < likes.length; i++) {
      if (i !== foundIndex) newLikes.push(likes[i]);
    }
    likes = newLikes;
  } else {
    likes.unshift({
      uri,
      meta,
    });
  }
  setLikes(likes);
  syncGlobalLikeUI(uri, isNowLiked);
  return isNowLiked;
}
// afspelen
document.getElementById("play-likes-btn")?.addEventListener("click", () => {
  const likes = getLikes();
  if (likes.length === 0) return;
  const uris = [];
  for (let i = 0; i < likes.length; i++) uris.push(likes[i].uri);
  playSong(uris, likes[0].meta);
});
document.getElementById("play-playlist-btn")?.addEventListener("click", () => {
  const titleEl = document.getElementById("playlist-title");
  const name = titleEl ? titleEl.textContent : "";
  const rawData = localStorage.getItem("spotify_custom_playlists");
  const playlists = JSON.parse(rawData || "{}");
  const tracks = playlists[name] || [];
  if (tracks.length === 0) return;
  const uris = [];
  for (let i = 0; i < tracks.length; i++) uris.push(tracks[i].uri);
  playSong(uris, tracks[0].meta);
});
// zoek acties
const zoekKnop = document.getElementById("zoekKnop");
const zoekVeld = document.getElementById("zoekVeld");
zoekKnop?.addEventListener("click", handleSearch);
zoekVeld?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});
// filters
const filterAlles = document.getElementById("alles");
const filterArtiesten = document.getElementById("artiesten");
const filterNummer = document.getElementById("nummer");

function updateFilterUI(activeBtn) {
  const filters = [filterAlles, filterArtiesten, filterNummer];
  for (let i = 0; i < filters.length; i++) {
    if (filters[i]) filters[i].classList.remove("selected");
  }
  if (activeBtn) activeBtn.classList.add("selected");
}
filterAlles?.addEventListener("click", () => {
  zoekInstelling = "artist,track";
  updateFilterUI(filterAlles);
});
filterArtiesten?.addEventListener("click", () => {
  zoekInstelling = "artist";
  updateFilterUI(filterArtiesten);
});
filterNummer?.addEventListener("click", () => {
  zoekInstelling = "track";
  updateFilterUI(filterNummer);
});
renderCustomPlaylists();
// details vanuit player
document.getElementById("now-art")?.addEventListener("click", () => {
  const current = getStoredCurrentTrack();
  if (current && current.uri) {
    showDetailPage(current.uri, "track");
  }
});
document.getElementById("now-name")?.addEventListener("click", () => {
  const current = getStoredCurrentTrack();
  if (current && current.uri) {
    showDetailPage(current.uri, "track");
  }
});
document.getElementById("now-artist")?.addEventListener("click", () => {
  const current = getStoredCurrentTrack();
  if (current && current.meta?.artistUri) {
    showDetailPage(current.meta.artistUri, "artist");
  }
});
