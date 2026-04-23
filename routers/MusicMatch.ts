import express,{Router} from "express";
import { 
    getMood,
    searchHandler,
    setMood,
    getSearchSetting,
    setsearchSetting,
    getZoekTerm,
    setZoekTerm,
    setStart,
    getStart,
    getGameRound,
    addOneGameRound,
    getGameScore,
    loadRoundData,
    getCurrentTrack
} from "../data";
//import type{ Artists,Tracks } from "../types";

let options:any = [];


export default function():Router{
    const router = express.Router();

    router.get("/",(req,res)=>{
        setStart(false);
        res.render("home",{page:"home",mood:getMood()});
    });

    router.post("/",(req,res)=>{
        setMood(req.body.mood);
        res.redirect("/");
    })

    router.get("/search",async(req,res)=>{ 
        const set = getSearchSetting();   
        const data =  await searchHandler(getZoekTerm(),set); 
        
        setStart(false);
        res.render("searchPage",{page:"search",results:data,set,mood:getMood()})
    });

    router.post("/search",async(req,res)=>{
        if(req.body.zoekVeld){
            setZoekTerm(req.body.zoekVeld);
        }
        res.redirect(`${req.baseUrl}/search`)
    });

    router.post("/search/setting",async(req,res)=>{
        setsearchSetting(req.body.set);
        res.redirect(`${req.baseUrl}/search`);
    })

    router.get("/game",(req,res)=>{
        res.render("gamePage",{page:"game",
            mood:getMood(),
            gameScore:getGameScore(),
            gameRound:getGameRound(),
            start:getStart(),
            opt:options,
            currentTrack:getCurrentTrack()});
    })

    router.post("/game",async(req,res)=>{
        if(req.body.start_knop){
            setStart(true);
            addOneGameRound();
        }
        
        options = await loadRoundData();
        console.log(options);
        res.redirect("game");
    })

    return router;
}