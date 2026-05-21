// Greeting functie: bepaald adhv tijd wat de begroeting is
const greetingEl = document.getElementById("greeting");

function setGreeting(name = null) {
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
  
  if (name) {
    greetingEl.innerHTML = `${greeting}, <span>${name}</span>`;
    const userNameEl = document.getElementById("user-name");
    if (userNameEl) userNameEl.textContent = name;
  } else {
    const nameSpan = greetingEl.querySelector("span");
    const currentName = nameSpan ? nameSpan.textContent : "gebruiker";
    greetingEl.innerHTML = `${greeting}, <span>${currentName}</span>`;
  }
}

// Gebruikersdata synchroniseren vanuit DB
async function initUserData() {
  try {
    const [likesRes, artistsRes] = await Promise.all([
        fetch("/api/user/likes"),
        fetch("/api/user/artists")
    ]);
    if (likesRes.ok) {
        const likes = await likesRes.json();
        if (typeof setLikes === "function") setLikes(likes);
    }
    if (artistsRes.ok) {
        const artists = await artistsRes.json();
        if (typeof setFollowedArtists === "function") setFollowedArtists(artists);
    }
  } catch (err) {
    console.error("Fout bij synchroniseren gebruikersdata:", err);
  }
}

// naam ophalen van spotify
(async function initGreeting() {
  await initUserData();
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

// Cookie helpers
function setCookie(name, value, days = 7) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const moodGenres = {
  "Chill": ["chill", "acoustic", "ambient"],
  "Focus": ["classical", "study", "piano"],
  "Party": ["edm", "party", "dance"],
  "Sad": ["sad", "blues", "soul"],
  "Workout": ["work-out", "rock", "heavy-metal"]
};

async function handleMoodGeneration() {
  const mood = getCookie("user_mood") || "Focus";
  const genres = moodGenres[mood] || ["pop"];
  const btn = document.getElementById("generate-mood-playlist");
  if (btn) btn.textContent = "GENEREREN...";

  try {
    const token = await getAuthToken();
    const likes = typeof getLikes === "function" ? getLikes() : [];
    const seedTracks = likes.slice(0, 2).map(l => l.id);

    let url = `https://api.spotify.com/v1/recommendations?limit=20&seed_genres=${genres.slice(0, 3).join(",")}`;
    if (seedTracks.length > 0) {
      url += `&seed_tracks=${seedTracks.join(",")}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.tracks) {
      const list = document.getElementById("generator-list");
      const results = document.getElementById("generator-results");
      if (list && results) {
        list.innerHTML = "";
        data.tracks.forEach(t => {
          const isLiked = likes.some(l => window.getTrackId(l.uri) === t.id);
          list.innerHTML += renderTrackRow(
            t.album.images?.[0]?.url,
            t.name,
            t.artists[0].name,
            "Nummer",
            t.uri,
            isLiked,
            t.artists[0].uri
          );
        });
        
        // Knop toevoegen om deze mix op te slaan als playlist
        const saveBtnId = "save-mood-mix";
        let saveBtn = document.getElementById(saveBtnId);
        if (!saveBtn) {
          saveBtn = document.createElement("button");
          saveBtn.id = saveBtnId;
          saveBtn.className = "btn btn-primary";
          saveBtn.style.marginTop = "20px";
          saveBtn.textContent = "DEZE MIX OPSLAAN ALS PLAYLIST";
          results.appendChild(saveBtn);
        }
        
        saveBtn.onclick = async () => {
          saveBtn.textContent = "OPSLAAN...";
          const trackData = data.tracks.map(t => ({
              uri: t.uri,
              id: t.id,
              meta: {
                  name: t.name,
                  artist: t.artists[0].name,
                  image: t.album.images?.[0]?.url,
                  artistUri: t.artists[0].uri
              }
          }));
          
          try {
              const createRes = await fetch("/api/playlists", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                      name: `Mijn ${mood} Mix`, 
                      description: `Gegenereerd op basis van ${mood} mood.`,
                      tracks: trackData
                  })
              });
              if (createRes.ok) {
                  const p = await createRes.json();
                  saveBtn.textContent = "GEDAAN!";
                  if (typeof renderCustomPlaylists === "function") renderCustomPlaylists();
                  if (typeof showPage === "function") showPage("playlist", { id: p._id, name: p.name });
              }
          } catch (err) {
              console.error("Fout bij opslaan mood mix:", err);
              saveBtn.textContent = "FOUT BIJ OPSLAAN";
          }
        };
        
        results.style.display = "block";
        if (typeof attachRowListeners === "function") attachRowListeners(list);
      }
    }
  } catch (err) {
    console.error("Fout bij genereren mood playlist:", err);
  } finally {
    if (btn) btn.textContent = "GENEREER NU";
  }
}

// Mood selector
const moods = document.querySelectorAll(".mood-chip");
const sidebarMood = document.getElementById("sidebar-mood");

function selectMood(mood, chip = null) {
  if (!chip) {
      chip = Array.from(moods).find(m => m.dataset.mood === mood);
  }
  if (!chip) return;

  for (let j = 0; j < moods.length; j++) {
    moods[j].classList.remove("selected");
  }
  chip.classList.add("selected");

  // Opslaan in cookie
  setCookie("user_mood", mood);

  // Update theme
  document.body.className = document.body.className.replace(/theme-\w+/g, "").trim();
  document.body.classList.add(`theme-${mood.toLowerCase()}`);

  // Update text
  const currentMoodText = document.getElementById("current-mood-text");
  if (currentMoodText) currentMoodText.textContent = mood;
  if (sidebarMood) sidebarMood.textContent = mood;
  
  const mobileMood = document.getElementById("mobile-mood");
  if (mobileMood) mobileMood.textContent = mood;
}

for (let i = 0; i < moods.length; i++) {
  moods[i].addEventListener("click", function () {
    const mood = this.dataset.mood || "Focus";
    selectMood(mood, this);
  });
}

// Init mood from cookie
const savedMood = getCookie("user_mood");
if (savedMood) {
    selectMood(savedMood);
}

document.getElementById("generate-mood-playlist")?.addEventListener("click", handleMoodGeneration);

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

if (typeof renderCustomPlaylists === "function") {
    renderCustomPlaylists();
}

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
