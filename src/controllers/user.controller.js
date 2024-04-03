import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler( async (req,res) => {
        const {fullname,email,username,password}=req.body
        console.log("email : ",email)

        if(
            [fullname,email,username,password].some ((field)=>
            field?.trim() === "")
        ){
            throw new ApiError(400,"fullname is required");
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if(existedUser){
            throw new ApiError(409,"User with email or Username already exists.")
        }

        console.log(req.files);

        const avatarLocalPath = req.files?.avatar[0]?.path
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;
        let coverImageLocalPath;
        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage > 0){
            coverImageLocalPath=req.files.coverImage[0].path;
        }
        
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file localPath is required");
        }
       
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
        
        if(!avatar){
            throw new ApiError(400,"Avatar file is required (2)");
        }

        //making entry in database with user(below)
        const user = await User.create({fullname,
                    avatar: avatar.url,
                    coverImage: coverImage?.url || "",
                    email,
                    password,
                    username: username.toLowerCase()
        })

        const createdUser = await User.findById(user._id)
        .select("-password -refreshToken")

        if(!createdUser){
            throw new ApiError("Something went wrong while registering the User.")
        }

        return res.status(201)
        .json(new ApiResponse(200,createdUser,"User Registered Success"))




    /*
    sort of algorithm for REGISTER.
    1.Get user details from frontend
    2.Validation   (eg. one example is koi fields empty na ho)
    3.Check if user already exist. *(username || email)
    4.Check for images, chk for avatar.
    5.Upload them to Cloudinary, avatar chk.
    6. Create user object. - create entry in DB.
    7.Send response back (by removing password and refreshToken Field)
    8.Check for userCreation.
    9.return response.
    
    */
    // res.status(200).json({
    //     message: "ok"
    // })
})

export {registerUser}