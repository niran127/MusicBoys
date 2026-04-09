import express,{Router} from "express";

export default function():Router{
    const router = express.Router();

    router.get("/",(req,res)=>{
        res.render("home")
    })

    return router;
}