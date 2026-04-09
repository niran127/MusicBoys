import express,{Router} from "express";
import { searchHandler } from "../data";
import type{ Artists,Tracks } from "../types";

export default function():Router{
    const router = express.Router();

    router.get("/",(req,res)=>{
        res.render("home",{page:"home"})
    });

    router.get("/search",async(req,res)=>{        
        res.render("searchPage",{page:"search"})
    });

    

    router.get("/game",(req,res)=>{
        res.render("gamePage",{page:"game"})
    })

    return router;
}