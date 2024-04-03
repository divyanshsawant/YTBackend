import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        //upload on cloudinary
       
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })

        //file has been uploaded successfylly
        // console.log("File has been uploaded successfully on cloudinary.!",response.url)
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        //if it is not uploaded, unlink it from local server\
        console.log("Error in CLoudinary func ", error)
        fs.unlinkSync(localFilePath);
        return null;
        // removes the locally saved temporary 
        //file as the upload operation got failed.
    }
}

export {uploadOnCloudinary};