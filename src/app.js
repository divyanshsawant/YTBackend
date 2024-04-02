import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,

}))

app.use(express.json({limit: "16kb"})); // limit the size of incoming request
app.use(express.urlencoded({extended:true,limit :"16kb"}))
app.use(express.static("public")) //store files in public folder in owr own server
app.use(cookieParser()) //handling browser cookies and performing curd ops.


export {app};