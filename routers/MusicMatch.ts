import express,{Router} from "express";
import { getMood, searchHandler, setMood,getSearchSetting,setsearchSetting } from "../data";
//import type{ Artists,Tracks } from "../types";

let zoekTerm = "";

export default function():Router{
    const router = express.Router();

    router.get("/",(req,res)=>{
        res.render("home",{page:"home",mood:getMood()});
    });

    router.post("/",(req,res)=>{
        setMood(req.body.mood);
        res.redirect("/");
    })

    router.get("/search",async(req,res)=>{ 
        const set = getSearchSetting();   
        const data =  await searchHandler(zoekTerm,set);    
        res.render("searchPage",{page:"search",results:data,set,mood:getMood()})
    });

    router.post("/search",async(req,res)=>{
        if(req.body.zoekVeld){
            zoekTerm = req.body.zoekVeld;
        }
        res.redirect(`${req.baseUrl}/search`)
    });

    router.post("/search/setting",async(req,res)=>{
        setsearchSetting(req.body.set);
        res.redirect(`${req.baseUrl}/search`);
    })

    router.get("/game",(req,res)=>{
        res.render("gamePage",{page:"game",mood:getMood()});
    })

    return router;
}