const chill = document.getElementById("chill");
const focus = document.getElementById("focus");
const party = document.getElementById("party");
const sad = document.getElementById("sad");
const workout = document.getElementById("workout");
const moodHeader = document.getElementById("moodHeader");

chill.addEventListener('click', function() {
    chill.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: chill"
});

focus.addEventListener('click', function() {
    focus.classList.add("selecteerd");
    chill.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: focus"
});

party.addEventListener('click', function() {
    party.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    chill.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: party"
});

sad.addEventListener('click', function() {
    sad.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    chill.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: sad"
});

workout.addEventListener('click', function() {
    workout.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    chill.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: workout"
});

