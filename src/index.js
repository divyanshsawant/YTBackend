// require('dotenv').config({path: './env'})

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv"
import express from "express"

dotenv.config({
    path: './env'
})

const app= express();

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port ${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.log("Error",error)
})






/*
import express from "express";
const app = express()

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Errr",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on PORT${process.env.PORT}`)
        })
    } catch (error) {
        console.error("Error",error)
    }
})()


*/
// function connectDB(){

// }

// connectDB();