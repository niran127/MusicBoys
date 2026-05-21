let zoekInstelling = "artist,track";

function getSimilarityScore(text, search) {
  text = text.toLowerCase();
  search = search.toLowerCase();
  if (text === search) {
    return 100;
  }
  if (text.indexOf(search) === 0) {
    return 80;
  }
  if (text.indexOf(search) !== -1) {
    return 50;
  }
  return 0;
}

async function handleSearch() {
  const zoekVeld = document.getElementById("zoekVeld");
  const resultaten = document.getElementById("resultaten");
  if (!zoekVeld || !resultaten) return;
  const query = zoekVeld.value.trim();
  if (!query) return;
  resultaten.innerHTML = `<div class="empty-state">zoeken...</div>`;
  try {
    const data = await spotifySearch(query, zoekInstelling);
    const likes = getLikes();
    // check if liked
    const checkLiked = (uri) => {
      for (let i = 0; i < likes.length; i++) {
        if (window.getTrackId(likes[i].uri) === window.getTrackId(uri))
          return true;
      }
      return false;
    };
    let finalHtml = "";
    if (zoekInstelling === "artist") {
      const artists = data.artists.items;
      if (artists.length === 0) {
        finalHtml = `<div class="empty-state">geen artiesten</div>`;
      } else {
        for (let i = 0; i < artists.length; i++) {
          const el = artists[i];
          const img = el.images && el.images[0] ? el.images[0].url : null;
          const followers =
            el.followers && el.followers.total
              ? el.followers.total.toLocaleString()
              : "0";
          finalHtml += renderTrackRow(
            img,
            el.name,
            `artiest · ${followers} volgers`,
            "Artiest",
            null,
            false,
            el.uri,
            el.name,
          );
        }
      }
    } else if (zoekInstelling === "track") {
      const tracks = data.tracks.items;
      if (tracks.length === 0) {
        finalHtml = `<div class="empty-state">niks gevonden</div>`;
      } else {
        for (let i = 0; i < tracks.length; i++) {
          const el = tracks[i];
          const img =
            el.album && el.album.images && el.album.images[0]
              ? el.album.images[0].url
              : null;
          let artistsStr = "";
          for (let j = 0; j < el.artists.length; j++) {
            artistsStr += el.artists[j].name;
            if (j < el.artists.length - 1) artistsStr += ", ";
          }
          const firstArtistUri = el.artists[0] ? el.artists[0].uri : null;
          finalHtml += renderTrackRow(
            img,
            el.name,
            artistsStr,
            "Nummer",
            el.uri,
            checkLiked(el.uri),
            firstArtistUri,
            artistsStr,
          );
        }
      }
    } else {
      const allItems = [];
      if (data.artists && data.artists.items) {
        for (let i = 0; i < data.artists.items.length; i++)
          allItems.push(data.artists.items[i]);
      }
      if (data.tracks && data.tracks.items) {
        for (let i = 0; i < data.tracks.items.length; i++)
          allItems.push(data.tracks.items[i]);
      }
      // sorteren
      allItems.sort((a, b) => {
        const scoreA = getSimilarityScore(a.name, query);
        const scoreB = getSimilarityScore(b.name, query);
        if (scoreA !== scoreB) return scoreB - scoreA;
        const popA = a.popularity || 0;
        const popB = b.popularity || 0;
        return popB - popA;
      });
      // eerste 8
      for (let i = 0; i < allItems.length && i < 8; i++) {
        const el = allItems[i];
        if (el.type === "artist") {
          const img = el.images && el.images[0] ? el.images[0].url : null;
          finalHtml += renderTrackRow(
            img,
            el.name,
            "artiest",
            "Artiest",
            null,
            false,
            el.uri,
            el.name,
          );
        } else {
          const img =
            el.album && el.album.images && el.album.images[0]
              ? el.album.images[0].url
              : null;
          let artistsStr = "";
          for (let j = 0; j < el.artists.length; j++) {
            artistsStr += el.artists[j].name;
            if (j < el.artists.length - 1) artistsStr += ", ";
          }
          const firstArtistUri = el.artists[0] ? el.artists[0].uri : null;
          finalHtml += renderTrackRow(
            img,
            el.name,
            artistsStr,
            "Nummer",
            el.uri,
            checkLiked(el.uri),
            firstArtistUri,
            artistsStr,
          );
        }
      }
      if (allItems.length === 0) {
        finalHtml = `<div class="empty-state">niks gevonden</div>`;
      }
    }
    resultaten.innerHTML = finalHtml;
    attachRowListeners(resultaten);
  } catch (err) {
    console.error(err);
    resultaten.innerHTML = `<div class="empty-state">oepsie...</div>`;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  // Zoekknop
  document.getElementById("zoekKnop")?.addEventListener("click", handleSearch);

  // Enter-toets in zoekveld
  document.getElementById("zoekVeld")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  // Filter chips: Alles / Artiesten / Nummers
  const filterMap = {
    alles: "artist,track",
    artiesten: "artist",
    nummer: "track",
  };

  Object.entries(filterMap).forEach(([id, waarde]) => {
    document.getElementById(id)?.addEventListener("click", () => {
      // Zet actieve chip
      document
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("selected"));
      document.getElementById(id)?.classList.add("selected");

      // Update zoekinstelling en zoek opnieuw als er al een query is
      zoekInstelling = waarde;
      const query = document.getElementById("zoekVeld")?.value.trim();
      if (query) handleSearch();
    });
  });
});
