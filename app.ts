import express from "express";
import path from "path";
import musicMatch from "./routers/MusicMatch";
import {connect} from "./data"

const app = express();

app.set("view engine","ejs");
app.set("port",1234);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended:true}));

app.use("/musicMatch",musicMatch());

app.get("/",(_,res)=>{
    res.redirect("/musicMatch");
})

app.listen(app.get("port"),async()=>{
    await connect()
    console.log("http://localhost:1234");
})