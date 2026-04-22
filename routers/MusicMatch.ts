import express,{Router} from "express";
import { getMood, searchHandler, setMood } from "../data";
import type{ Artists,Tracks } from "../types";

export default function():Router{
    const router = express.Router();

    router.get("/",(req,res)=>{
        res.render("home",{page:"home",mood:getMood()});
    });

    router.post("/",(req,res)=>{
        setMood(req.body.mood);
        console.log(req.body.mood)
        res.redirect("/")
    })

    router.get("/search",async(req,res)=>{        
        res.render("searchPage",{page:"search",data:0});
    });

    router.post("/search",async(req,res)=>{
        const data =  await searchHandler(req.body.zoekVeld,"track,artist");
        res.render("searchPage",{page:"search",results:data})
    });

    router.get("/game",(req,res)=>{
        res.render("gamePage",{page:"game"});
    })

    return router;
}