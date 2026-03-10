const chill = document.getElementById("chill");
const focus = document.getElementById("focus");
const party = document.getElementById("party");
const sad = document.getElementById("sad");
const workout = document.getElementById("workout");
const moodHeader = document.getElementById("moodHeader");

const alles = document.getElementById("alles");
const artiesten = document.getElementById("artiesten");
const nummer = document.getElementById("nummer");
const zoekKnop = document.getElementById("zoekKnop");
const zoekVeld = document.getElementById("zoekVeld");

let zoekInstelling;

const clientId = '7c5773b9dcc149b38a50f1d7d83c34a7';
const clientSecret = 'f9a584351aac45889f29e806274d73c4';

async function getAccessToken() {

    const credentials = btoa(clientId + ':' + clientSecret);

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + credentials
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

async function getArtiest(naamArtiest,zoekInstelling ) {
    try {
        const token = await getAccessToken();

        const response = await fetch(`https://api.spotify.com/v1/search?q=${naamArtiest}&type=${zoekInstelling}&limit=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        console.log(data);
        
    } catch (error) {
        console.error("Technische fout:", error);
    }
}


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


alles.addEventListener('click',()=>{
    artiesten.classList.remove("selecteerd");
    alles.classList.add("selecteerd");
    nummer.classList.remove('selecteerd');

    zoekInstelling = "artist,track";
});

artiesten.addEventListener('click',()=>{
    artiesten.classList.add("selecteerd");
    alles.classList.remove("selecteerd");
    nummer.classList.remove('selecteerd');

    zoekInstelling = "artist";
});

nummer.addEventListener('click',()=>{
    artiesten.classList.remove("selecteerd");
    alles.classList.remove("selecteerd");
    nummer.classList.add('selecteerd');

    zoekInstelling = "track";
});

zoekKnop.addEventListener('click',()=>{
    getArtiest(zoekVeld.value,zoekInstelling);
})