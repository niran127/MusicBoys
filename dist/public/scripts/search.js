"use strict";
let zoekInstelling = "artist,track";
function getSimilarityScore(text, search) {
    text = text.toLowerCase();
    search = search.toLowerCase();
    if (text === search)
        return 100;
    if (text.indexOf(search) === 0)
        return 80;
    if (text.indexOf(search) !== -1)
        return 50;
    return 0;
}
window.handleSearch = async function () {
    const zoekVeld = document.getElementById("zoekVeld");
    const resultaten = document.getElementById("resultaten");
    if (!zoekVeld || !resultaten)
        return;
    const query = zoekVeld.value.trim();
    if (!query)
        return;
    resultaten.innerHTML = `<div class="empty-state">zoeken...</div>`;
    try {
        const data = await window.spotifySearch?.(query, zoekInstelling);
        const likes = window.getLikes?.() || [];
        const checkLiked = (uri) => likes.some((l) => window.getTrackId(l.uri) === window.getTrackId(uri));
        let finalHtml = "";
        if (zoekInstelling === "artist") {
            const artists = data.artists.items;
            if (artists.length === 0) {
                finalHtml = `<div class="empty-state">geen artiesten</div>`;
            }
            else {
                for (let i = 0; i < artists.length; i++) {
                    const el = artists[i];
                    const img = el.images && el.images[0] ? el.images[0].url : null;
                    const followers = el.followers && el.followers.total ? el.followers.total.toLocaleString() : 0;
                    finalHtml += window.renderTrackRow(img, el.name, `artiest · ${followers} volgers`, "Artiest", null, false, el.uri, el.name);
                }
            }
        }
        else if (zoekInstelling === "track") {
            const tracks = data.tracks.items;
            if (tracks.length === 0) {
                finalHtml = `<div class="empty-state">niks gevonden</div>`;
            }
            else {
                for (let i = 0; i < tracks.length; i++) {
                    const el = tracks[i];
                    const img = el.album?.images?.[0]?.url || null;
                    const artistStr = el.artists.map((a) => a.name).join(", ");
                    const firstArtistUri = el.artists[0]?.uri || null;
                    finalHtml += window.renderTrackRow(img, el.name, artistStr, "Nummer", el.uri, checkLiked(el.uri), firstArtistUri, artistStr);
                }
            }
        }
        else {
            const allItems = [];
            if (data.artists?.items)
                allItems.push(...data.artists.items);
            if (data.tracks?.items)
                allItems.push(...data.tracks.items);
            allItems.sort((a, b) => {
                const scoreA = getSimilarityScore(a.name, query);
                const scoreB = getSimilarityScore(b.name, query);
                if (scoreA !== scoreB)
                    return scoreB - scoreA;
                return (b.popularity || 0) - (a.popularity || 0);
            });
            for (let i = 0; i < allItems.length && i < 8; i++) {
                const el = allItems[i];
                if (el.type === "artist") {
                    const img = el.images?.[0]?.url || null;
                    finalHtml += window.renderTrackRow(img, el.name, "artiest", "Artiest", null, false, el.uri);
                }
                else {
                    const img = el.album?.images?.[0]?.url || null;
                    const artistStr = el.artists.map((a) => a.name).join(", ");
                    const firstArtistUri = el.artists[0]?.uri || null;
                    finalHtml += window.renderTrackRow(img, el.name, artistStr, "Nummer", el.uri, checkLiked(el.uri), firstArtistUri, artistStr);
                }
            }
            if (allItems.length === 0)
                finalHtml = `<div class="empty-state">niks gevonden</div>`;
        }
        resultaten.innerHTML = finalHtml;
        window.attachRowListeners?.(resultaten);
    }
    catch (err) {
        console.error(err);
        resultaten.innerHTML = `<div class="empty-state">oepsie...</div>`;
    }
};
