import test, { it } from "node:test";
import { Artists, Tracks,User,PlayList } from "./types";
import { Collection, MongoClient, ObjectId } from "mongodb";

const SP_CLIENT_ID = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET = "f9a584351aac45889f29e806274d73c4";
const userId:ObjectId = new ObjectId('69ee27d4ab968a0c548a0890'); 

export const client = new MongoClient("mongodb+srv://ap-cluster:qjJvDt8FGpOPaYog@ap-cluster.cqjj65z.mongodb.net/");
export const userCollection: Collection<User> = client.db("MusicMatch").collection<User>("user");
export const playListCollection: Collection<PlayList> = client.db("MusicMatch").collection<PlayList>("playList");

let mood:string = "";
let searchSetting:string = "track,artist";
let zoekTerm:string = "";
let start:boolean = false;
let gameRound:number = 0;
let gameScore:number = 0;
let answer = false;
let userAnswer: number | null = null;

const userName:string = "test";

export  let correct = false;

export function getAnswer(){
    return answer;
}

export function setAnswer(input:boolean){
    answer = input
}

export function getUserAnswer(){
    return userAnswer;
}

export function setUserAnswer(id: number | null){
    userAnswer = id;
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

export function setSearchSetting(input:string){
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
    const likeList = await playListCollection.findOne({listName:"Likes"})

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
                liked:likeList!.songsId.find(item=>item===el.id),
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
                id:el.id,
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
                liked:likeList!.songsId.find(item=>item===el.id),
                id:el.id,
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

export function getCurrentTrack(){
    return currentTrack;
}

export async function loadRoundData() {
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=pop&limit=50&entity=song&media=music`);
        const data = await res.json();

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
        
        return await options;
    } catch (err) {
        console.log(err )
        return null;
    }
}

export function handleAnswer(trackId:number):void {  
    correct = trackId == currentTrack.id;
    if(correct){
        gameScore++
    }
}

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

async function getUserByName():Promise<User | null> {
    return await userCollection.findOne({name:userName});
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

export async function likeHandler(id:string) {
    const userId = await getUserByName();
    let likesList = await playListCollection.findOne({
        userId:userId!._id,
        listName:"Likes"
    });

    if(likesList?.songsId.includes(id)){
        await playListCollection.updateOne(
            { userId: userId!._id, listName: "Likes" },
            { $pull: { songsId: id } }
        );
    }
    else{
        await playListCollection.updateOne(
            { userId: userId!._id, listName: "Likes" },
            { $addToSet: { songsId: id } } // Maakt de lijst aan als deze nog niet bestaat!
        );
    }
}

async function opIdsZoekSpotify():Promise<any> {
    const userId = await getUserByName();
    const token = await getAuthToken();
    const ids:PlayList|null = await playListCollection.findOne({listName:"Likes",userId:userId!._id})
    if(ids?.songsId .length !== 0){
    const idsString = ids?.songsId.join(",");

    const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${idsString}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data:any = await response.json();
    return data;
}
    return null
}

export async function likesHandler():Promise<any>{
    const data = await opIdsZoekSpotify()
    
    if(data !== null){
    const tra = data.tracks.map((el:any)=>{
            return{
                liked:true,
                id:el.id,
                type:"track",
                img:el.album.images[0],
                name:el.name,
                artistsStr:el.artists.map((el:any)=>el.name).join(","),
                artistUri:el.artists[0].id,
                uri:el.uri
            }
        });
    return tra;
    }
    return null;
}