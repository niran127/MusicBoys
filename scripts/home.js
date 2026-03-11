// Greeting functie: bepaald adhv tijd wat de begroeting is
const greetingEl = document.getElementById("greeting");

function setGreeting(name = "gebruiker") {
  const hour = new Date().getHours();
  let greeting;

  if (hour < 12) greeting = "Goedemorgen";
  else if (hour < 17) greeting = "Goedemiddag";
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
