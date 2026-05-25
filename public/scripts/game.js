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
  return (vol !== null ? parseFloat(vol) : 0.5) * 0.3; // Standaard op 50% bar (= 15% geluid)
}

// Luister naar volume veranderingen terwijl de game speelt
window.addEventListener("volumeChange", (e) => {
  if (previewAudio) {
    previewAudio.volume = e.detail.volume;
  }
});

window.initGame = async function () {
  console.log("[MusicBoys] iTunes Game initialiseren...");
  const gamePage = document.getElementById("page-game");
  if (!gamePage) return;

  // reset game state
  gameScore = 0;
  gameRound = 0;
  gameRoundActive = false;

  renderIntro();
};

function renderIntro() {
  const gamePage = document.getElementById("page-game");
  if (!gamePage) return;

  gamePage.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1 class="game-title">Music Quiz</h1>
                <p style="color: var(--muted); margin-bottom: 20px;">Herken populaire hits in 10 seconden!</p>
            </div>
            <div class="game-intro">
                <p style="opacity: 0.8; line-height: 1.6;">Luister naar een fragment van een bekende hit en kies de juiste titel.<br>Je hebt 10 seconden de tijd per nummer.</p>
                <button class="btn btn-primary" id="start-game-btn" style="margin-top: 30px; padding: 16px 40px;">START QUIZ</button>
            </div>
        </div>
    `;

  document
    .getElementById("start-game-btn")
    ?.addEventListener("click", startNewRound);
}

async function startNewRound() {
  if (gameRoundActive) return;
  gameRoundActive = true;
  gameRound++;

  // Stop eventuele oude audio
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  // Stop hoofdplayer als die bestaat
  if (window.spPlayer) {
    window.spPlayer.pause();
  }

  if (gameTimerInterval) clearInterval(gameTimerInterval);
  gameTimerValue = 0;
  gameIsPlayingSnippet = false;

  const gamePage = document.getElementById("page-game");
  if (!gamePage) return;

  gamePage.innerHTML = `
        <div class="game-container">
            <div class="game-header" style="margin-bottom: 30px;">
                <h1 class="game-title">Music Quiz</h1>
                <div class="game-score" style="font-weight: 700; color: var(--muted);">Score: ${gameScore} | Ronde: ${gameRound}</div>
            </div>
            
            <div class="audio-visualizer" id="visualizer">
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
            </div>

            <div class="game-player-controls">
                <button class="game-play-btn" id="game-toggle-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </button>
                <div class="game-timer-container">
                    <div class="game-timer-fill" id="game-timer-fill"></div>
                </div>
            </div>

            <div class="options-grid" id="options-container">
                <div class="loading-pulse" style="grid-column: 1 / -1; padding: 20px; color: var(--muted);">Laden van fragment...</div>
            </div>

            <div id="game-status" style="margin-top: 24px; font-weight: 700; font-size: 1.1rem; min-height: 1.5rem;"></div>
            <button class="btn btn-primary next-btn" id="next-round-btn">VOLGENDE RONDE</button>
        </div>
    `;

  document
    .getElementById("game-toggle-btn")
    ?.addEventListener("click", toggleSnippet);
  document
    .getElementById("next-round-btn")
    ?.addEventListener("click", startNewRound);

  try {
    await loadRoundData();
  } catch (err) {
    console.error("Game load error:", err);
    const container = document.getElementById("options-container");
    if (container) {
      container.innerHTML = `<div class="error">Kon geen muziek laden. Probeer het opnieuw.</div>`;
    }
  }
}

async function loadRoundData() {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=pop&limit=50&entity=song&media=music`,
    );
    const data = await res.json();

    if (!data || !data.results || data.results.length === 0) {
      throw new Error("Geen nummers gevonden in de iTunes API");
    }

    const validTracks = data.results.filter((t) => t.previewUrl);

    if (validTracks.length < 4) {
      throw new Error("Niet genoeg nummers met preview beschikbaar");
    }

    const randomIndex = Math.floor(Math.random() * validTracks.length);
    const selected = validTracks[randomIndex];

    currentTrack = {
      id: selected.trackId,
      name: selected.trackName,
      artists: [{ name: selected.artistName }],
      preview_url: selected.previewUrl,
      image: selected.artworkUrl100,
    };

    let others = validTracks.filter((t) => t.trackId !== selected.trackId);
    others.sort(() => 0.5 - Math.random());
    const distractors = others.slice(0, 3).map((t) => ({
      id: t.trackId,
      name: t.trackName,
      artists: [{ name: t.artistName }],
    }));

    options = [currentTrack, ...distractors].sort(() => 0.5 - Math.random());

    previewAudio = new Audio(currentTrack.preview_url);
    previewAudio.volume = getAppVolume();

    previewAudio.onended = () => {
      stopSnippet();
    };

    renderOptions();
  } catch (err) {
    console.error("[MusicBoys] Game error (iTunes):", err);
    const container = document.getElementById("options-container");
    if (container) {
      container.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; color: #f87171;">Fout bij laden van muziek: ${err.message}. Probeer opnieuw.</div>`;
    }
    const nextBtn = document.getElementById("next-round-btn");
    if (nextBtn) {
      nextBtn.style.display = "block";
      nextBtn.textContent = "RETRY";
    }
    gameRoundActive = false;
  }
}

function renderOptions() {
  const container = document.getElementById("options-container");
  if (!container) return;
  container.innerHTML = "";

  options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span>${idx + 1}.</span> ${opt.name} - ${opt.artists[0].name}`;
    btn.dataset.id = opt.id.toString();
    btn.addEventListener("click", () => handleAnswer(opt.id, btn));
    container.appendChild(btn);
  });
}

function toggleSnippet() {
  if (!previewAudio) return;
  if (gameIsPlayingSnippet) {
    pauseSnippet();
  } else {
    playSnippet();
  }
}

function playSnippet() {
  if (!previewAudio || gameIsPlayingSnippet) return;

  if (window.spPlayer) {
    window.spPlayer.pause();
  }

  previewAudio.play();
  gameIsPlayingSnippet = true;

  const btn = document.getElementById("game-toggle-btn");
  if (btn) {
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  }

  document
    .querySelectorAll(".bar")
    .forEach((bar) => bar.classList.add("animating"));

  if (gameTimerInterval) clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(() => {
    gameTimerValue += 100;
    const percent = (gameTimerValue / 10000) * 100;
    const fill = document.getElementById("game-timer-fill");
    if (fill) {
      fill.style.width = `${Math.min(percent, 100)}%`;
    }

    if (gameTimerValue >= 10000) {
      stopSnippet();
    }
  }, 100);
}

function pauseSnippet() {
  if (!previewAudio) return;
  previewAudio.pause();
  gameIsPlayingSnippet = false;

  const btn = document.getElementById("game-toggle-btn");
  if (btn) {
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  }

  document
    .querySelectorAll(".bar")
    .forEach((bar) => bar.classList.remove("animating"));

  if (gameTimerInterval) clearInterval(gameTimerInterval);
}

function stopSnippet() {
  pauseSnippet();
  if (previewAudio) {
    previewAudio.currentTime = 0;
  }
}

function handleAnswer(trackId, selectedBtn) {
  if (!gameRoundActive || !currentTrack) return;

  stopSnippet();

  const isCorrect = trackId === currentTrack.id;
  const statusEl = document.getElementById("game-status");
  const optionsBtns = document.querySelectorAll(".option-btn");

  optionsBtns.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.id == currentTrack.id) {
      btn.classList.add("correct");
    } else if (btn === selectedBtn && !isCorrect) {
      btn.classList.add("wrong");
    }
  });

  if (statusEl) {
    if (isCorrect) {
      gameScore += 10;
      statusEl.textContent = "Correct! +10 punten";
      statusEl.style.color = "#4ade80";

      // Sync game score with backend per user
      fetch("/api/user/game-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: gameScore }),
      }).catch((e) => console.error("Could not sync game score:", e));
    } else {
      statusEl.textContent = `Fout! Het was ${currentTrack.name}`;
      statusEl.style.color = "#f87171";
    }
  }

  const nextBtn = document.getElementById("next-round-btn");
  if (nextBtn) {
    nextBtn.style.display = "block";
  }
  gameRoundActive = false;
}
