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
const pageHome = document.getElementById("page-home");
const pageZoeken = document.getElementById("page-zoeken");

function showPage(page) {
  pageHome.style.display = "none";
  pageZoeken.style.display = "none";
  navHome.classList.remove("active");
  navZoeken.classList.remove("active");

  if (page === "home") {
    pageHome.style.display = "flex";
    navHome.classList.add("active");
  } else if (page === "zoeken") {
    pageZoeken.style.display = "flex";
    navZoeken.classList.add("active");
  }
}

navHome.addEventListener("click", () => showPage("home"));
navZoeken.addEventListener("click", () => showPage("zoeken"));

// "zoek muziek" knop verwijst naar zoek pagina
document
  .getElementById("action-zoek")
  .addEventListener("click", () => showPage("zoeken"));

// De Spotify API functies (search & playback) staan nu in spotify.js om dubbele code te voorkomen

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

function renderTrackRow(imageUrl, name, subtitle, type, trackUri = null) {
  const eName = name.replace(/"/g, '&quot;');
  const eSub  = subtitle.replace(/"/g, '&quot;');
  const data  = trackUri
    ? `data-uri="${trackUri}" data-name="${eName}" data-artist="${eSub}" data-image="${imageUrl || ''}"`
    : '';
  
  const playIcon = `
    <div class="play-overlay">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>
  `;

  return `
    <div class="track-row${trackUri ? ' playable' : ''}" ${data}>
      <div class="track-art-container">
        ${
          imageUrl
            ? `<img class="track-art" src="${imageUrl}" alt="${name}" onerror="this.style.display='none'">`
            : `<div class="track-art-placeholder">:(</div>`
        }
        ${trackUri ? playIcon : ''}
      </div>
      <div class="track-info">
        <div class="track-name">${name}</div>
        <div class="track-artist">${subtitle}</div>
      </div>
      <span class="track-type-badge">${type}</span>
      <button class="track-like-btn" title="Like">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>
  `;
}

// zoek acties
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
            return renderTrackRow(img, el.name, artists, "Nummer", el.uri);
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
              return renderTrackRow(img, el.name, "Artiest", "Artiest");
            } else {
              const img = el.album?.images?.[0]?.url || null;
              const artists = el.artists.map((a) => a.name).join(", ");
              return renderTrackRow(img, el.name, artists, "Nummer", el.uri);
            }
          })
          .join("") ||
        `<div class="empty-state">Geen resultaten gevonden</div>`;
    }

    // like toggle button
    resultaten.querySelectorAll(".track-like-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        btn.classList.toggle("liked");
      });
    });

    // klik om af te spelen
    resultaten.querySelectorAll(".track-row.playable").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".track-like-btn")) return;
        playSong(row.dataset.uri, {
          name:   row.dataset.name,
          artist: row.dataset.artist,
          image:  row.dataset.image,
        });
      });
    });
  } catch (err) {
    console.error(err);
    resultaten.innerHTML = `<div class="empty-state">Er ging iets mis. Probeer opnieuw.</div>`;
  }
});
