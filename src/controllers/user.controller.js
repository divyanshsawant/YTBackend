import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        console.log(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;

        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

    } catch (error) {
        console.log('Errr is ',error)
        throw new ApiError(500,"Something went wrong while generating Access and Refresh Token")
    }
}



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

const loginUser = asyncHandler(async (req,res) => {
    
    const {email,username,password} = req.body
    console.log(req.body);
    if(!(email)){
        throw new ApiError(400,"Username or Email Required")
    }

    //find user
    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist!")
    }

    //password chk using bcrypt
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials")
    }

    const {accessToken,refreshToken} =await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //designing options for cookies.
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser, accessToken,
                refreshToken
            },
            "user logged in successfully!!!"
            )
    )


    
    
    
    /* 
        Sort of Algorithm for LOGIN
        1.Get user credentials req.body
        2.Match username or email
        3.Find the user
        4.Password chk
        5.Access and refresh Token
        6.Send token in cookies and send response
    */
})


const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out Successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incommingRefreshToken){
        throw new ApiError(401,"Unauthorized Requesttt")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incommingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used...")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(200,
                {
                    accessToken,refreshToken,
                },
                "Access Token refreshed"
                )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password has been changed successfully!"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"Current User fetched Successfully."))
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullname, email} = req.body
    if(!fullname || !email){
        throw new ApiError(400,"All fields are required!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            },
            
        },{new : true})
        .select("-password")


        return res
        .status(200)
        .json(
            new ApiResponse(200,user,"Account details updated successfully!")
        )
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar: avatar.url
            }
        },{
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar Image Updated Successfully")
    )
})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on avatar.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage: coverImage.url
            }
        },{
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image Updated Successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params //url

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    //User.find({username})//instead of finding user and the applying aggregation we will directly apply aggregation
    const channel = User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
                }
        },
        {
            $lookup:{
                from: "subscriptions", //mongo changes the name to plural
                localField: "_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
            from: "subscriptions", //mongo changes the name to plural
                localField: "_id",
                foreignField: "subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount : {
                    $size : "$subscribers" //field should start with dollar
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$subscribers"]
                        },
                        then:true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname : 1, //1 indicates value is passed, ie fullname
                username : 1,
                subscribersCount : 1,
                channelsSubscribedToCount : 1,
                isSubscribed : 1,
                avatar: 1,
                coverImage : 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,'Channel does not exist.')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectID(req.user._id)
            }
        },
        {
            $lookup:{
                from : "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as : "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from : "users",
                            localField: "owner", //video model
                            foreignField: "_id",
                            as : "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "owner",
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(
        new ApiResponse(200,user[0].WatchHistory,"Watchh history fetched succesfully")
    )
})

/*
Now here we know that we will recieve an array, whose [0] field will be important to us
Easier sol ->
to make frontend job easy->
adding one more pipeline 
*/

export {registerUser,
loginUser,
logoutUser,
refreshAccessToken,
changeCurrentPassword,
getCurrentUser,
updateAccountDetails,
updateUserAvatar,
updateUserCoverImage,
getUserChannelProfile,
getWatchHistory
}