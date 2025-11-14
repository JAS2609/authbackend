import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError}from "../utils/ApiError.js"
import {User} from"../models/user.models.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import  jwt  from "jsonwebtoken"

  const generateAccessAndRefreshToken=async(userId)=>{
   
try {
   const user=await User.findById(userId)
    if(!user){
      throw new ApiError(400,"user not found")
    }
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()
    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false})
    return{accessToken,refreshToken}
  
} catch (error) {
  throw new ApiError(500,"Something wnet wrong while generating access and refresh token");
  
}}

const registerUser=asyncHandler(async(req,res)=>{
    const{fullname,email,username,password,adminCode}=req.body
    
  
    if([fullname,email,username,password].some((field)=>field?.trim()==="")){
         throw new ApiError(400,"All fields are required")
    }
       const existedUser=await User.findOne({
        $or:[{email},{username}]
       })
    if(existedUser){
    return res.status(400).json({ message: "User already exists. Please login." });
    }
  let role = "user";
  if (adminCode && adminCode === process.env.ADMIN_SECRET_CODE) {
    role = "admin";
  }

try {
      const user=await User.create({
        fullname,
        email,
        password,
        username:username.toLowerCase(),
        role,
      })
      const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
      )
      if(!createdUser){
        throw new ApiError(500,"Something went wrong registering the user")
      }
      return res.status(201).json(new ApiResponse(200,createdUser,"User registerred successfully"))
} catch (error) {
    console.log("user creation failed")

}
  
})


const loginUser=asyncHandler(async(req,res)=>{
  console.log("req.body:", req.body);

  const{email,username,password}=req.body||{}
   if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
       const user=await User.findOne({
        $or:[{email},{username}]
       }) 
       if(!user){
        throw new ApiError(404,"user not found")
       }

      const isPasswordValid= await user.isPasswordCorrect(password)
      if(!isPasswordValid){
        throw new ApiError(400,"invalid credentials")
      }
      const{accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

      const loggedInUser=await User.findById(user._id)
      .select("-password -refreshToken");
      if(!loggedInUser){
        throw new ApiError(500,"error in user login")
      }
      const isProd = process.env.NODE_ENV === "production";

    const options = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    };

      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(new ApiResponse(
        200,
      { user: loggedInUser,accessToken,refreshToken},
        "user logged in successfully"))

})
const loggedOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const isProd = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/", 
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});
const refreshAccessToken=asyncHandler( async(req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(400,"refresh token is required")
  }
  try {
    const decodedToken= jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET

    )
    const user=await User.findById(decodedToken?._id)
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
   if(incomingRefreshToken!==user?.refreshToken){
       throw new ApiError(401,"Invalid refresh token or expired")
    }
    const options={
        httpOnly:true,
        secure: process.env.NODE_ENV==="production",
      }
    const {accessToken,refreshToken:newRefreshToken}= await generateAccessAndRefreshToken(user._id)
      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(new ApiResponse(
        200,
      { accessToken,
        refreshToken:newRefreshToken
      },
        "Access token refreshed successfully"));


  } catch (error) {
    throw new ApiError(500,"something went wrong refreshing access token ")
  }

})
const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body
  const user=await User.findById(req.user?._id)
  const isPasswordValid=await user.isPasswordCorrect(oldPassword)
  if (!isPasswordValid) {
    throw new ApiError(401,"Invalid old password")
  }
  user.password=newPassword
  await user.save({validateBeforeSave:false})
    return res.status(200)
      .json(new ApiResponse(
        200,
      {},
        "Password changed successfully"));

})
const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current User Details"));

})
 const getMe = async (req, res) => {
  try {
    const userId = req.user.id; 
    const user = await User.findById(userId).select("id fullname username email role createdAt");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Current User Details",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



export{registerUser,loginUser,refreshAccessToken,loggedOutUser,changeCurrentPassword,
getCurrentUser ,getMe}