import test from "node:test";
import { Artists, Tracks,User,PlayList } from "./types";
import { Collection, MongoClient, ObjectId } from "mongodb";

const SP_CLIENT_ID = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET = "f9a584351aac45889f29e806274d73c4";
const userId:ObjectId = new ObjectId('69ee27d4ab968a0c548a0890'); 

let mood:string = "";
let searchSetting:string = "track,artist";
let zoekTerm:string = "";
let start:boolean = false;
let gameRound:number = 0;
let gameScore:number = 0;
let answor = false;


export  let correct = false;

export function getAnswor(){
    return answor;
}

export function setAnswor(input:boolean){
    answor = input
}

export function getGameScore():number{
    return gameScore;
}

export function getGameRound():number{
    return gameRound;
}

export function addOneGameRound():void{
    gameRound ++;
}

export function getStart():boolean{
    return start;
}

export function setStart(input:boolean):void{
    start = input
}

export function getZoekTerm():string{
    return zoekTerm;
}

export function setZoekTerm(input:string):void{
    zoekTerm = input;
}

export function getSearchSetting(){
    return searchSetting;
}

export function setsearchSetting(input:string){
    searchSetting = input;
}

export function getMood(){
    return mood;
}

export function setMood(input:string){
    mood = input;
}

// Dit object vervangt localStorage op de server
let serverTokens: { at?: string; rt?: string; exp?: number } = {};


function getSimilarityScore(text:string, search:string) {
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

function storeTokens({ access_token, refresh_token, expires_in }: { 
    access_token: string, 
    refresh_token?: string, 
    expires_in: number 
}) {
    serverTokens.at = access_token;
    serverTokens.exp = Date.now() + (expires_in * 1000);
    if (refresh_token) {
        serverTokens.rt = refresh_token;
    }
}

async function spRefresh() {
    if (!serverTokens.rt) return null;
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: SP_CLIENT_ID,
            grant_type: "refresh_token",
            refresh_token: serverTokens.rt,
        }),
    });
    const d = await res.json();
    if (d.access_token) {
        storeTokens(d);
        return d.access_token;
    }
    return null;
}

async function getAuthToken() {
    // Check of we al een token hebben en of deze nog geldig is (met 1 minuut marge)
    if (serverTokens.at && serverTokens.exp && Date.now() < serverTokens.exp - 60000) {
        return serverTokens.at;
    }

    // Probeer refresh als dat kan, anders client credentials
    let token = await spRefresh();
    if (!token) {
        const credentials = btoa(`${SP_CLIENT_ID}:${SP_CLIENT_SECRET}`);
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${credentials}`,
            },
            body: "grant_type=client_credentials",
        });
        const data = await response.json();
        storeTokens(data);
        token = data.access_token;
    }
    return token;
}

async function spotifySearch(query: string, type: string) {
    const token = await getAuthToken();
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=8`;
    
    const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
    });
    return response.json();
}

export async function searchHandler(query:string,type:string){
    
    if (!query || !type) return;
    const queryTrim = query.trim();
    if (!queryTrim) return;
    
    const data = await spotifySearch(queryTrim, type);

    if (type === "artist") {
      const artists:Artists = data;
      if (artists.artists.items.length === 0) {
        return 0;
      } else {
        return artists.artists.items.map((el:any)=>{
            return {
                type:"artist",
                img: el.images[0],
                name:el.name,
                uri:el.uri
            }
        });
      }
    } else if (type === "track") {
      const tracks:Tracks = data;
      if (tracks.tracks.items.length === 0) {
        return 0;
      } else {
        return tracks.tracks.items.map((el)=>{
            return{
                type:"track",
                img:el.album.images[0],
                name:el.name,
                artistsStr:el.artists.map((el)=>el.name).join(","),
                artistUri:el.artists[0].id,
                uri:el.uri
            }
        });
      }
    } else {
    let art;
    let tra;
      if (data.artists && data.artists.items) {
         art = data.artists.items.map((el:any)=>{
            return {
                type:"artist",
                img: el.images[0],
                name:el.name,
                uri:el.uri
            }
        });
      }
      if (data.tracks && data.tracks.items) {
         tra = data.tracks.items.map((el:any)=>{
            return{
                type:"track",
                img:el.album.images[0],
                name:el.name,
                artistsStr:el.artists.map((el:any)=>el.name).join(","),
                artistUri:el.artists[0].id,
                uri:el.uri
            }
        });
      }

      const allItems = [... tra ,... art]
      // sorteren
      allItems.sort((a, b) => {
        const scoreA = getSimilarityScore(a.name, queryTrim);
        const scoreB = getSimilarityScore(b.name, queryTrim);
        if (scoreA !== scoreB) return scoreB - scoreA;
        const popA = a.popularity || 0;
        const popB = b.popularity || 0;
        return popB - popA;
      });
      return allItems.slice(0,8);
      }
    }

let currentTrack:any = null;
let options:any = [];
let previewAudio:any = null;
let gameTimerInterval:any = null;
let gameTimerValue = 0;
let gameIsPlayingSnippet = false;
let gameRoundActive = false;

export function getCurrentTrack(){
    return currentTrack;
}

function getAppVolume() {
    const vol = localStorage.getItem("app_volume_pct");
    return vol !== null ? parseFloat(vol) : 0.5; // default 0.5
}

export async function loadRoundData() {
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=pop&limit=50&entity=song&media=music`);
        const data = await res.json();
        
        console.log(data)

        if (!data || !data.results || data.results.length === 0) {
            throw new Error("Geen nummers gevonden in de iTunes API");
        }

        // iTunes resultaten hebben altijd een previewUrl
        const validTracks = data.results.filter((t:any) => t.previewUrl);

        if (validTracks.length < 4) {
            throw new Error("Niet genoeg nummers met preview beschikbaar");
        }

        // Kies een random correct nummer
        const randomIndex = Math.floor(Math.random() * validTracks.length);
        const selected = validTracks[randomIndex];
        
        currentTrack = {
            id: selected.trackId,
            name: selected.trackName,
            artists: [{ name: selected.artistName }],
            preview_url: selected.previewUrl,
            image: selected.artworkUrl100
        };
        
        // Kies 3 random foute opties uit de rest van de lijst
        let others = validTracks.filter((t:any) => t.trackId !== selected.trackId);
        others.sort(() => 0.5 - Math.random());
        const distractors = others.slice(0, 3).map((t:any) => ({
            id: t.trackId,
            name: t.trackName,
            artists: [{ name: t.artistName }]
        }));
        
        options = [currentTrack, ...distractors].sort(() => 0.5 - Math.random());
        
        // Audio klaarzetten
        //previewAudio = new Audio(currentTrack.preview_url);
        //previewAudio.volume = getAppVolume();
        
        // Luister naar volume veranderingen in de player bar
        /*document.querySelector(".vol-bar")?.addEventListener("click", () => {
            if (previewAudio) {
                previewAudio.volume = getAppVolume();
            }
        });
        */
        /*previewAudio.onended = () => {
            //stopSnippet();
        };*/
        return await options;
        //renderOptions();
    } catch (err) {
        console.log(err )
        return null;
        /*console.error("[MusicBoys] Game error (iTunes):", err);
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
        */
    }
}

function toggleSnippet() {
    if (!previewAudio) return;
    
    if (gameIsPlayingSnippet) {
        //pauseSnippet();
    } else {
        //playSnippet();
    }
}
/*
function playSnippet() {
    if (!previewAudio || gameIsPlayingSnippet) return;
    
    previewAudio.play();
    gameIsPlayingSnippet = true;
    
    // Toggle icon naar pause
    const btn = document.getElementById("game-toggle-btn");
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    
    // Start visualizer
    document.querySelectorAll(".bar").forEach(bar => bar.classList.add("animating"));
    
    // Start timer interval (100ms voor soepele bar)
    clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        gameTimerValue += 100;
        const percent = (gameTimerValue / 10000) * 100;
        document.getElementById("game-timer-fill").style.width = `${Math.min(percent, 100)}%`;
        
        if (gameTimerValue >= 10000) {
            stopSnippet();
        }
    }, 100);
}

function pauseSnippet() {
    if (!previewAudio) return;
    previewAudio.pause();
    gameIsPlayingSnippet = false;
    
    // Toggle icon naar play
    const btn = document.getElementById("game-toggle-btn");
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    
    // Stop visualizer
    document.querySelectorAll(".bar").forEach(bar => bar.classList.remove("animating"));
    
    clearInterval(gameTimerInterval);
}

function stopSnippet() {
    pauseSnippet();
    if (previewAudio) {
        previewAudio.currentTime = 0;
    }
    // We laten de timer staan op waar die was of we resetten hem?
    // De user kan hem weer opnieuw afspelen zolang ze geen antwoord hebben gegeven
}
*/
export function handleAnswer(trackId:number):void {  
    console.log(trackId);
    console.log(typeof currentTrack.id)
    correct = trackId == currentTrack.id;
    if(correct){
        gameScore++
    }
}

export const client = new MongoClient("mongodb+srv://ap-cluster:qjJvDt8FGpOPaYog@ap-cluster.cqjj65z.mongodb.net/");
export const userCollection: Collection<User> = client.db("MusicMatch").collection<User>("user");
export const playListCollection: Collection<PlayList> = client.db("MusicMatch").collection<PlayList>("playList");


async function exit() {
    try {
        await client.close();
        console.log('Disconnected from database');
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

async function seed() {
    const user : User[] = [
        {
            _id:new ObjectId(),
            name:"test"
        }
    ];
    const liked:PlayList[] = user.map((el)=>{
        return{
        userId:el._id!,
        listName:"Likes",
        songsId:[]
    }
    })
    
    if (await userCollection.countDocuments() === 0 ) {
        await userCollection.insertMany(user);
        await playListCollection.insertMany(liked);
    }

}

async function getStudents() {
    return await userCollection.find().toArray();
}

export async function connect() {
    try {
        await client.connect();
        await seed();
        console.log('Connected to database');
        process.on('SIGINT', exit);
    } catch (error) {
        console.error(error);
    }
}