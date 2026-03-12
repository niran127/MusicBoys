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

const homeKnop = document.getElementById("homeKnop");
const zoekenKnop = document.getElementById("zoekenKnop");
const home = document.getElementById("home");
const zoekPagina = document.getElementById("zoekPagina");
const collectiePagina = document.getElementById("collectiePagina");

const resultaten = document.getElementById("resultaten");
let data;

let zoekInstelling = "artist,track";

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
    console.log(data)
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

        return data;
        
    } catch (error) {
        console.error("Technische fout:", error);
    }
}

function getSimilarityScore(text, search) {
  if (text === search) return 100;      // Exacte match (hoogste prio)
  if (text.startsWith(search)) return 80; // Begint met de zoekterm
  if (text.includes(search)) return 50;   // Zoekterm zit er ergens in
  
  // Optioneel: geef punten voor kortere namen (relevanter)
  return 0; 
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

zoekKnop.addEventListener('click',async()=>{
    data = await getArtiest(zoekVeld.value,zoekInstelling);
    console.log(data);
    if(zoekInstelling === "artist"){
        resultaten.innerHTML = data.artists.items.map((el)=>`
        <li>
            <div>
                <div></div>
                <img src="${el.images[0].url}" alt="">
                <div>
                    <h3>${el.name}</h3>
                    <h4>${el.type}</h4>
                </div>
            </div>
            <div><button>play</button><button>like</button></div>
        </li>
    `).join("");
    }
    else if(zoekInstelling === "track"){
        resultaten.innerHTML = data.tracks.items.map((el)=>`
        <li>
            <div>
                <div></div>
                <img src="${el.album.images[0].url}" alt="">
                <div>
                    <h3>${el.name}</h3>
                    <h4>${el.type}</h4>
                </div>
            </div>
            <div><button>play</button><button>like</button></div>
        </li>
        `).join("");
    }
    else if(zoekInstelling === "artist,track"){
        const allItems = [...data.artists.items,...data.tracks.items];

        allItems.sort((a,b)=>{
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const query = zoekVeld.value.toLowerCase();

            const scoreA = getSimilarityScore(nameA, query);
            const scoreB = getSimilarityScore(nameB,query);

            if(scoreA != scoreB){
                return scoreB - scoreA;
            }
            return (b.popularity || 0) - (a.popularity || 0);
        });
         resultaten.innerHTML = allItems.map((el)=>{
            if(el.type === 'artist'){
            return(`
                 <li>
                <div>
                    <div></div>
                    <img src="${el.images[0].url}" alt="">
                    <div>
                        <h3>${el.name}</h3>
                        <h4>${el.type}</h4>
                    </div>
                </div>
                <div><button>play</button><button>like</button></div>
            </li>
             `)
            }
            else return(`
        <li>
            <div>
                <div></div>
                <img src="${el.album.images[0].url}" alt="">
                <div>
                    <h3>${el.name}</h3>
                    <h4>${el.type}</h4>
                </div>
            </div>
            <div><button>play</button><button>like</button></div>
        </li>
        ` )

    }).splice(0,5).join("");
    }
});

homeKnop.addEventListener("click",()=>{
    zoekenKnop.classList.remove("aanwezig");
    homeKnop.classList.add("aanwezig");
    collectieKnop.remove("aanwezig");

    collectiePagina.style.display = "none";
    home.style.display = "block";
    zoekPagina.style.display = "none";
});

zoekenKnop.addEventListener("click",()=>{
    zoekenKnop.classList.add("aanwezig");
    homeKnop.classList.remove("aanwezig");
    collectieKnop.classList.remove("aanwezig");

    collectiePagina.style.display = "none"
    home.style.display = "none";
    zoekPagina.style.display = "block";
});

collectieKnop.addEventListener("click",()=>{
    zoekenKnop.classList.remove("aanwezig");
    homeKnop.classList.remove("aanwezig");
    collectieKnop.classList.add("aanwezig");

    collectiePagina.style.display = "block"
    home.style.display = "none";
    zoekPagina.style.display = "none";
});