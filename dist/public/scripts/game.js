let gameScore = 0;
let gameRound = 0;
let currentTrack = null;
let options = [];
let previewAudio = null;
let gameTimerInterval = null;
let gameTimerValue = 0;
let gameIsPlayingSnippet = false;
let gameRoundActive = false;
function getAppVolume() {
    const vol = localStorage.getItem("app_volume_pct");
    return vol !== null ? parseFloat(vol) : 0.5;
}
window.initGame = async function () {
    const gamePage = document.getElementById("page-game");
    if (!gamePage)
        return;
    gameScore = 0;
    gameRound = 0;
    gameRoundActive = false;
    showStartScreen();
};
function showStartScreen() {
    const gamePage = document.getElementById("page-game");
    if (!gamePage)
        return;
    gamePage.innerHTML = `
        <div class="game-container" style="background: var(--surface); border: 1px solid var(--border); padding: 50px; border-radius: 30px; text-align: center; max-width: 500px; width: 90%; box-shadow: 0 24px 48px rgba(0,0,0,0.4);">
            <div class="game-header" style="margin-bottom: 30px;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent); text-transform: uppercase;">Muziek Quiz</span>
                <h1 style="font-size: 2.5rem; font-weight: 800; margin-top: 10px;">Music Quiz</h1>
            </div>
            <div id="game-start-screen">
                <p style="color: var(--muted); margin-bottom: 30px;">Herken populaire hits in 10 seconden!<br>Hoogste score wint.</p>
                <button id="start-game-btn" class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.1rem;">START SPEL</button>
            </div>
        </div>
    `;
    document.getElementById("start-game-btn")?.addEventListener("click", startNewRound);
}
async function startNewRound() {
    if (gameRoundActive)
        return;
    gameRoundActive = true;
    gameRound++;
    if (previewAudio) {
        previewAudio.pause();
        previewAudio = null;
    }
    const spPlayer = window.spPlayer;
    if (spPlayer)
        spPlayer.pause();
    if (gameTimerInterval)
        clearInterval(gameTimerInterval);
    gameTimerValue = 0;
    gameIsPlayingSnippet = false;
    const gamePage = document.getElementById("page-game");
    if (!gamePage)
        return;
    gamePage.innerHTML = `
        <div class="game-container" style="background: var(--surface); border: 1px solid var(--border); padding: 50px; border-radius: 30px; text-align: center; max-width: 500px; width: 90%; box-shadow: 0 24px 48px rgba(0,0,0,0.4);">
            <div class="game-header" style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent);">RONDE ${gameRound}</span>
                    <div id="game-score" style="font-weight: 700; background: var(--card); padding: 4px 12px; border-radius: 8px;">Score: ${gameScore}</div>
                </div>
            </div>
            
            <div id="game-quest">
                <div class="vinyl-record" id="vinyl" style="width: 150px; height: 150px; border-radius: 50%; background: #111; margin: 0 auto 30px; position: relative; border: 10px solid #222;">
                  <div style="width: 40px; height: 40px; background: var(--accent); border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
                </div>

                <div class="game-timer-container" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-bottom: 30px; overflow: hidden;">
                    <div class="game-timer-fill" id="game-timer-fill" style="width: 0%; height: 100%; background: var(--accent); transition: width 0.1s linear;"></div>
                </div>

                <div class="options-grid" id="options-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="grid-column: 1/-1; color: var(--muted);">Laden...</div>
                </div>

                <div id="game-feedback" style="margin-top: 24px; font-weight: 700; min-height: 24px;"></div>
                
                <button id="next-round-btn" class="btn btn-primary" style="display: none; width: 100%; margin-top: 20px;">VOLGENDE RONDE</button>
            </div>
        </div>
    `;
    document.getElementById("next-round-btn")?.addEventListener("click", startNewRound);
    try {
        await loadRoundData();
    }
    catch (err) {
        console.error("Game load error:", err);
    }
}
async function loadRoundData() {
    const topics = ["hits 2024", "top 50", "popular hits", "chart toppers", "pop music"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    try {
        const res = await window.spotifySearch?.(topic, "track");
        const tracks = res?.tracks?.items || [];
        // Filter tracks that have a preview_url (some Spotify tracks don't)
        // If no Spotify previews, fallback to iTunes for the audio part, but keep Spotify metadata
        // Actually, Spotify previews are often null now. I'll use a mix or just iTunes for audio but Spotify for the rest?
        // Wait, the user said the JS was perfect. If it used Spotify, maybe it used the Spotify SDK for playback.
        // But for a quiz, you want a 10s snippet.
        const validTracks = tracks.filter((t) => t.preview_url || t.uri);
        if (validTracks.length === 0) {
            // Fallback to iTunes if Spotify doesn't provide previews (common)
            const itunesRes = await fetch(`https://itunes.apple.com/search?term=${topic}&limit=50&entity=song&media=music`);
            const itunesData = await itunesRes.json();
            const itunesValid = itunesData.results.filter((t) => t.previewUrl);
            const selected = itunesValid[Math.floor(Math.random() * itunesValid.length)];
            currentTrack = {
                id: selected.trackId,
                name: selected.trackName,
                artists: [{ name: selected.artistName }],
                preview_url: selected.previewUrl,
                image: selected.artworkUrl100
            };
            let others = itunesValid.filter((t) => t.trackId !== selected.trackId);
            others.sort(() => 0.5 - Math.random());
            const distractors = others.slice(0, 3).map((t) => ({
                id: t.trackId,
                name: t.trackName,
                artists: [{ name: t.artistName }]
            }));
            options = [currentTrack, ...distractors].sort(() => 0.5 - Math.random());
        }
        else {
            const selected = validTracks[Math.floor(Math.random() * validTracks.length)];
            // If Spotify has no preview_url, we might need iTunes to get a snippet for the same track
            let previewUrl = selected.preview_url;
            if (!previewUrl) {
                const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(selected.name + " " + selected.artists[0].name)}&limit=1&entity=song`);
                const itunesData = await itunesRes.json();
                previewUrl = itunesData.results?.[0]?.previewUrl;
            }
            currentTrack = {
                id: selected.id,
                name: selected.name,
                artists: selected.artists,
                preview_url: previewUrl || "",
                image: selected.album?.images?.[0]?.url || ""
            };
            if (!currentTrack.preview_url) {
                // If still no preview, just try another round
                loadRoundData();
                return;
            }
            let others = tracks.filter((t) => t.id !== selected.id);
            others.sort(() => 0.5 - Math.random());
            const distractors = others.slice(0, 3).map((t) => ({
                id: t.id,
                name: t.name,
                artists: t.artists
            }));
            options = [currentTrack, ...distractors].sort(() => 0.5 - Math.random());
        }
        previewAudio = new Audio(currentTrack.preview_url);
        previewAudio.volume = getAppVolume() * 0.4;
        previewAudio.play();
        gameIsPlayingSnippet = true;
        document.getElementById("vinyl")?.style.setProperty("animation", "spin 4s linear infinite");
        gameTimerInterval = setInterval(() => {
            gameTimerValue += 100;
            const percent = (gameTimerValue / 10000) * 100;
            const fill = document.getElementById("game-timer-fill");
            if (fill)
                fill.style.width = `${Math.min(percent, 100)}%`;
            if (gameTimerValue >= 10000)
                stopSnippet();
        }, 100);
        renderOptions();
    }
    catch (err) {
        console.error("Game data error:", err);
    }
}
function stopSnippet() {
    if (previewAudio)
        previewAudio.pause();
    gameIsPlayingSnippet = false;
    if (gameTimerInterval)
        clearInterval(gameTimerInterval);
    document.getElementById("vinyl")?.style.setProperty("animation", "none");
}
function renderOptions() {
    const container = document.getElementById("options-container");
    if (!container)
        return;
    container.innerHTML = "";
    options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerHTML = `<span>${String.fromCharCode(65 + idx)}</span> ${opt.name}`;
        btn.addEventListener("click", () => handleAnswer(opt.id, btn));
        container.appendChild(btn);
    });
}
function handleAnswer(trackId, selectedBtn) {
    if (!gameRoundActive || !currentTrack)
        return;
    stopSnippet();
    const isCorrect = trackId === currentTrack.id;
    const feedbackEl = document.getElementById("game-feedback");
    const optionsBtns = document.querySelectorAll(".option-btn");
    optionsBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        // Show correct answer anyway
        if (btn._id === currentTrack?.id) {
            btn.classList.add("correct");
            btn.style.opacity = "1";
        }
    });
    selectedBtn.style.opacity = "1";
    if (isCorrect) {
        gameScore += 10;
        selectedBtn.classList.add("correct");
        if (feedbackEl) {
            feedbackEl.textContent = "CORRECT! +10";
            feedbackEl.style.color = "#4ade80";
        }
    }
    else {
        selectedBtn.classList.add("wrong");
        if (feedbackEl) {
            feedbackEl.textContent = `FOUT! HET WAS: ${currentTrack.name.toUpperCase()}`;
            feedbackEl.style.color = "#f87171";
        }
        // Mark the correct one
        optionsBtns.forEach(btn => {
            if (btn.innerHTML.includes(currentTrack.name)) {
                btn.classList.add("correct");
                btn.style.opacity = "1";
            }
        });
    }
    const nextBtn = document.getElementById("next-round-btn");
    if (nextBtn)
        nextBtn.style.display = "block";
    gameRoundActive = false;
}
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .option-btn:hover { border-color: var(--accent) !important; background: rgba(255,255,255,0.05) !important; }
`;
document.head.appendChild(style);
export {};
