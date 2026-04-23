// Globale variabelen
let previewAudio = null;
let gameTimerInterval = null;
let gameTimerValue = 0;
let gameIsPlayingSnippet = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialiseer de audio
    if (window.gameConfig && window.gameConfig.previewUrl) {
        previewAudio = new Audio(window.gameConfig.previewUrl);
        const savedVolume = localStorage.getItem("app_volume_pct") || 0.5;
        previewAudio.volume = parseFloat(savedVolume);
        previewAudio.onended = () => stopSnippet();
    }

    // 2. Koppel de play/pause knop
    const toggleBtn = document.getElementById("game-toggle-btn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            // Als de tijd op is, mag je niet meer afspelen
            if (gameTimerValue >= 10000) return;

            if (gameIsPlayingSnippet) {
                pauseSnippet();
            } else {
                playSnippet();
            }
        });
    }
});

// Start of hervat het nummer
function playSnippet() {
    if (!previewAudio || gameTimerValue >= 10000) return;

    previewAudio.play();
    gameIsPlayingSnippet = true;

    // UI Update naar "Pauze-icoon"
    document.getElementById("game-toggle-btn").innerHTML = 
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    
    document.querySelectorAll(".bar").forEach(bar => bar.classList.add("animating"));

    // Timer door laten lopen
    gameTimerInterval = setInterval(() => {
        gameTimerValue += 100;
        const percent = (gameTimerValue / 10000) * 100;
        const fill = document.getElementById("game-timer-fill");
        if (fill) fill.style.width = `${Math.min(percent, 100)}%`;

        if (gameTimerValue >= 10000) {
            stopSnippet(); // 10 seconden op: definitief stoppen
        }
    }, 100);
}

// Pauzeert alleen (mag later weer verder)
function pauseSnippet() {
    if (!previewAudio) return;
    
    previewAudio.pause();
    gameIsPlayingSnippet = false;
    clearInterval(gameTimerInterval); // Timer pauzeert ook

    // UI Update naar "Play-icoon"
    document.getElementById("game-toggle-btn").innerHTML = 
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    
    document.querySelectorAll(".bar").forEach(bar => bar.classList.remove("animating"));
}

// Stopt definitief (gebruikt als tijd op is of bij antwoord)
function stopSnippet() {
    if (!previewAudio) return;
    
    previewAudio.pause();
    previewAudio.currentTime = 0; // Terug naar start
    gameIsPlayingSnippet = false;
    
    // Timer bevriezen en op max zetten
    clearInterval(gameTimerInterval);
    gameTimerValue = 10000; 
    const fill = document.getElementById("game-timer-fill");
    if (fill) fill.style.width = "100%";

    // UI Update
    document.getElementById("game-toggle-btn").innerHTML = 
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    document.querySelectorAll(".bar").forEach(bar => bar.classList.remove("animating"));
}