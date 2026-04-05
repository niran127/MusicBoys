import express from "express";
import path from "path";

const app = express();

app.set("view engine","ejs");
app.set("port",1234);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended:true}));

app.get("/",(req,res)=>{
    res.render("home")
})

app.listen(app.get("port"),()=>{
    console.log("http://localhost:1234");
})