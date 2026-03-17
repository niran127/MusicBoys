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
const collectieKnop = document.getElementById("collectieKnop");
const home = document.getElementById("home");
const zoekPagina = document.getElementById("zoekPagina");
const collectiePagina = document.getElementById("collectiePagina");
const gamePagina = document.getElementById("gamePagina");
const gameKnop = document.getElementById("gameKnop");

const resultaten = document.getElementById("resultaten");

const populariteitSort = document.getElementById("populariteitSort");
const alphabetischSort = document.getElementById("alphabetischSort");
const duurtijdsort = document.getElementById("duurtijdsort");
const dropbtn = document.getElementById("dropbtn");

const likeNummers = document.getElementById("likeNummers");
const gegNummers = document.getElementById("gegNummers");

const lijst = document.getElementById("lijst");

const countLike = document.getElementById("countLike");

const genereerKnop = document.getElementById("genereerKnop");

const lijstGeg = document.getElementById("lijstGeg");

let genre = ""; 

let data;
const likedSongs = [];
let songs = [];

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
async function getTrackByGenre() {
    try {
        const token = await getAccessToken();

        const eersteGenre = genre.split(',')[0].trim();

        const response = await fetch(`https://api.spotify.com/v1/search?q=$genre:${eersteGenre}&type=track&limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log("Genre data:", data);
        return data;
        
    } catch (error) {
        console.error("Technische fout bij genre zoeken:", error);
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
    genre = "Lo-fi,easy listening,new age,indie pop,alternative r&b"
});

focus.addEventListener('click', function() {
    focus.classList.add("selecteerd");
    chill.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: focus"
    genre = "Easy listening,soft rock,alternative,indie,slowcore"
});

party.addEventListener('click', function() {
    party.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    chill.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: party"
    genre = "Pop Rock,K-Pop,Hyperpop,nightcore,bubblegum pop"
});

sad.addEventListener('click', function() {
    sad.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    chill.classList.remove("selecteerd");
    workout.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: sad"
    genre = "Emo,indie punk,slowcore,new age,alternative,indie"
});

workout.addEventListener('click', function() {
    workout.classList.add("selecteerd");
    focus.classList.remove("selecteerd");
    party.classList.remove("selecteerd");
    sad.classList.remove("selecteerd");
    chill.classList.remove("selecteerd");

    moodHeader.innerHTML = "Mood: workout"
    genre = "hardstyle,work-out"
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
            <div><button>play</button><button class="likeButton ${likedSongs.indexOf(el.id) === -1? '':'geliked'}" id="${el.id}">like</button></div>
        </li>
        `).join("");
        actieveerKnoppen()
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
            <div><button>play</button><button class="likeButton ${likedSongs.indexOf(el.id) === -1? '':'geliked'}" id="${el.id}" >like</button></div>
        </li>
        ` )

    }).splice(0,5).join("");
    }
    actieveerKnoppen()
});

homeKnop.addEventListener("click",()=>{
    zoekenKnop.classList.remove("aanwezig");
    homeKnop.classList.add("aanwezig");
    collectieKnop.classList.remove("aanwezig");

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

populariteitSort.addEventListener("click",()=>{
    dropbtn.innerHTML = "sorteer op: populariteit";
})

alphabetischSort.addEventListener("click",()=>{
    dropbtn.innerHTML = "sorteer op: alphabetisch";
})

duurtijdsort.addEventListener("click",()=>{
    dropbtn.innerHTML = "sorteer op: duurtijd"
})

likeNummers.addEventListener("click",()=>{
    likeNummers.classList.add("colSel");
    gegNummers.classList.remove("colSel");

    lijst.style.display = "block";
    lijstGeg.style.display = "none";
})

gegNummers.addEventListener("click",()=>{
    gegNummers.classList.add("colSel");
    likeNummers.classList.remove("colSel");

    lijstGeg.style.display = "block";
    lijst.style.display = "none";
})




function actieveerKnoppen() {
    const likeButtons = document.querySelectorAll('.likeButton');
    console.log("Aantal knoppen gevonden:", likeButtons.length); // Check je console!

    likeButtons.forEach(button => {
        // Verwijder eventuele oude listeners om dubbele kliks te voorkomen
        button.replaceWith(button.cloneNode(true));
    });

    // Selecteer ze opnieuw na het clonen
    const freshButtons = document.querySelectorAll('.likeButton');

    freshButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Voorkom dat de pagina herlaadt
            
            const knopId = this.id; 
            const index = likedSongs.indexOf(knopId);

            console.log("Geklikt op ID:", knopId);

            if (index === -1) {
                likedSongs.push(knopId);
                this.classList.add("geliked");
                console.log("Status: Toegevoegd"+this.classList);
            } else {
                likedSongs.splice(index, 1);
                this.classList.remove("geliked");
                console.log("Status: Verwijderd" + this.classList);
                
            }
            countLike.innerHTML = `nummers gelikete: ${likedSongs.length}`
            console.log("Huidige lijst:", likedSongs);
        });
    });
}

likeNummers.addEventListener("click", async () => {
    for(id of likedSongs){
        const song = await getSongById(id);
        songs.push(song);
    }
    lijst.innerHTML = songs.sort((a,b)=>{
        if(dropbtn.innerHTML === "sorteer op: alphabetisch"){
            return a.name.localeCompare(b.name)
        }
        else if(dropbtn.innerHTML === "sorteer op: populariteit"){
            return b.popularity - a.popularity
        }
        else{
            return b.duration_ms - a.duration_ms
        }
    }).map((el)=>{
        return `
            <li>
                    <img src="${el.album.images[0].url}" alt="">
                    <div>
                        <h4>${el.name}</h4>
                        <p>${el.artists[0].name} ° ${el.album.name}</p>
                    </div>
                    <button class="likeButton geliked" id="${el.id}">Like</button>
                </li>
        `
    }).join("");
    lijst.display = "block"
    songs = [];
    console.log(songs);
    actieveerKnoppen()
   });

async function getSongById(id) {
    try {
        const token = await getAccessToken();

        const response = await fetch("https://api.spotify.com/v1/tracks/"+id, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log(data)
        return data;
        
    } catch (error) {
        console.error("Technische fout:", error);
    }
}

genereerKnop.addEventListener("click", async () => {
    const data = await getTrackByGenre(); 
    
    // Check of er wel data en tracks zijn teruggekomen
    if (data && data.tracks && data.tracks.items) {
        lijstGeg.innerHTML = data.tracks.items.map((el) => {
            return `
                <li>
                    <img src="${el.album.images[0].url}" alt="">
                    <div>
                        <h4>${el.name}</h4>
                        <p>${el.artists[0].name} ° ${el.album.name}</p>
                    </div>
                    <button class="likeButton ${likedSongs.indexOf(el.id) === -1 ? '' : 'geliked'}" id="${el.id}">Like</button>
                </li>
            `;
        }).join("");
        
        actieveerKnoppen(); // Vergeet niet de like-knoppen weer te activeren!
    } else {
        lijstGeg.innerHTML = "<li>Geen nummers gevonden voor dit genre.</li>";
    }
});