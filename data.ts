import { Artists, Tracks } from "./types";

const SP_CLIENT_ID = "7c5773b9dcc149b38a50f1d7d83c34a7";
const SP_CLIENT_SECRET = "f9a584351aac45889f29e806274d73c4";

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
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`;
    
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
                type:type,
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
                type:type,
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
                type:type,
                img: el.images[0],
                name:el.name,
                uri:el.uri
            }
        });
      }
      if (data.tracks && data.tracks.items) {
         tra = data.tracks.items.map((el:any)=>{
            return{
                type:type,
                img:el.album.images[0],
                name:el.name,
                artistsStr:el.artists.join(","),
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
      return allItems;
      }
    }