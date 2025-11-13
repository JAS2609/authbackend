import { Router } from "express";
import {registerUser,loggedOutUser, loginUser, 
    refreshAccessToken, changeCurrentPassword, 
    getCurrentUser
    } from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router =Router()
router.route("/signup").post(registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

 
 router.route("/logout").post(verifyJWT,loggedOutUser)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/me").get(verifyJWT,getCurrentUser)
export default router;