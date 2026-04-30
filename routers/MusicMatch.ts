import express,{Router} from "express";
import { 
    getMood,
    searchHandler,
    setMood,
    getSearchSetting,
    setSearchSetting,
    getZoekTerm,
    setZoekTerm,
    setStart,
    getStart,
    getGameRound,
    addOneGameRound,
    getGameScore,
    loadRoundData,
    getCurrentTrack,
    getAnswer,
    setAnswer,
    correct,
    handleAnswer,
    getUserAnswer,
    setUserAnswer,
    likeHandler,
    likesHandler
} from "../data";
import type{ Artists,Tracks } from "../types";

let options:any = [];
// Voeg deze functie toe aan je bestand (of een utils.ts)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


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
        setSearchSetting(req.body.set);
        res.redirect(`${req.baseUrl}/search`);
    })

    router.get("/game",async(req,res)=>{
        res.render("gamePage",{page:"game",
            mood:getMood(),
            gameScore:getGameScore(),
            gameRound:getGameRound(),
            start:getStart(),
            opt:options,
            currentTrack:await getCurrentTrack(),
            answer:getAnswer(),
            correct:correct,
            userAnswer:getUserAnswer()});
    })

    router.post("/game/start",async(req,res)=>{
        if(req.body.start_knop){
            setStart(true);
            addOneGameRound();
            setAnswer(false);
            setUserAnswer(null);
        }
        options = await loadRoundData();
        while(options === null){
            await sleep(2000);
            options = await loadRoundData();
        }

        res.redirect("/musicMatch/game");
    });
    router.post("/game/answer",async(req,res)=>{
        setAnswer(true);
        const choice = +req.body.answer;
        setUserAnswer(choice);
        handleAnswer(choice);
        res.redirect("/musicMatch/game");   
    })

    router.post("/game/next",async(req,res)=>{
        setAnswer(false);
        setUserAnswer(null);
        options = await loadRoundData();
        while(options === null){
            await sleep(2000);
            options = await loadRoundData();
        }
        addOneGameRound();
        res.redirect("/musicMatch/game");
    })

    router.post("/search/like",async(req,res)=>{
        
        await likeHandler(req.body.likeId);
        res.redirect("/musicMatch/search");
    })

    router.get("/likes",async(req,res)=>{
        const data = await likesHandler();
         res.render("likePage",{page:"",results:data,mood:getMood()})
    })

    router.post("/likePage/like",async(req,res)=>{
        await likeHandler(req.body.likeId);
        res.redirect("/musicMatch/likes");
    })
    return router;
}