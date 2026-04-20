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
document.querySelectorAll(".mood-chip").forEach((chip, idx) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".mood-chip")
      .forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
    
    const mood = chip.dataset.mood;
    if (typeof window.updateHeaderMood === "function") window.updateHeaderMood(mood);
    saveUserMood(mood);
    
    const colors = ["#7c5cfc", "#ff6b6b", "#4ecdc4", "#ffe66d", "#ff9ff3"];
    document.documentElement.style.setProperty("--accent", colors[idx % colors.length]);
  });
});

window.updateHeaderMood = function(mood) {
  const textEl = document.getElementById("current-mood-text");
  if (textEl) textEl.textContent = mood;
}

async function saveUserMood(mood) {
  await fetch('/api/user/mood', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood })
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
  .getElementById("nav-game")
  ?.addEventListener("click", () => showPage("game"));
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
  if (typeof spIsLoggedIn === "function" && !spIsLoggedIn()) {
    showCustomModal({
      title: "Inloggen vereist",
      message: "Je moet ingelogd zijn bij Spotify om playlists te maken die bewaard blijven.",
      confirmText: "Login",
      onConfirm: () => {
        if (typeof spotifyLogin === "function") spotifyLogin();
      }
    });
    return;
  }

  showCustomModal({
    title: "Nieuwe playlist",
    message: "Geef een naam op voor je nieuwe afspeellijst.",
    showInput: true,
    placeholder: "Bv. og katy perry on top",
    onConfirm: async (name) => {
      if (name && name.trim()) {
        const playlists = window.getStoredPlaylists();
        if (playlists.some(p => p.name === name)) {
          showCustomModal({
            title: "Oeps!",
            message: "Deze playlist bestaat al!",
          });
          return;
        }
        const created = await window.createBackendPlaylist(name);
        if (created) {
           if (typeof window.renderCustomPlaylists === "function") window.renderCustomPlaylists();
           showPage("playlist", name);
        }
      }
    },
  });
});
// playlist verwijderen
document
  .getElementById("delete-playlist-btn")
  ?.addEventListener("click", () => {
    const titleEl = document.getElementById("playlist-title");
    const name = titleEl ? titleEl.textContent : "";
    showCustomModal({
      title: "Playlist verwijderen",
      message: `Weet je zeker dat je de playlist '${name}' wilt verwijderen?`,
      confirmText: "Verwijderen",
      isDanger: true,
      onConfirm: async () => {
        const playlists = window.getStoredPlaylists();
        const pl = playlists.find((p) => p.name === name);
        if (pl) {
          await window.deleteBackendPlaylist(pl._id);
        }
        showPage("home");
      },
    });
  });

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
    const playlists = window.getStoredPlaylists();
    const pl = playlists.find(p => p.name === name);
    const tracks = pl ? pl.tracks : [];
    if (tracks.length === 0) return;
    const uris = tracks.map(t => t.uri);
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
  if (zoekVeld?.value.trim()) handleSearch();
});
filterArtiesten?.addEventListener("click", () => {
  zoekInstelling = "artist";
  updateFilterUI(filterArtiesten);
  if (zoekVeld?.value.trim()) handleSearch();
});
filterNummer?.addEventListener("click", () => {
  zoekInstelling = "track";
  updateFilterUI(filterNummer);
  if (zoekVeld?.value.trim()) handleSearch();
});
if (typeof window.renderCustomPlaylists === "function") window.renderCustomPlaylists();
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
