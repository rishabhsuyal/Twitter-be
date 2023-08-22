import express from 'express'
import auth  from '../middleware/authorization.js'


import { 
    createTweet,
    followManager,
    getHome,
    getUser,
    getUserTweets,
    login, 
    logintoken, 
    register,
    updateUser,
    editTweet,
    deleteTweet,
    getHomeOwn
} from '../controllers/user.controller.js'


const router = express.Router()

router.get("/", (req, res) => res.send("just dev."))

router.get("/home", getHome)
router.post("/homeOwn", getHomeOwn)

router.get("/user", getUser)

router.get("/userTweets", getUserTweets)

router.post("/register", register)

router.post("/login", login)

router.post("/auth", logintoken)

router.post("/tweet", auth, createTweet)

router.post("/editTweet", editTweet)

router.post("/deleteTweet", deleteTweet)

router.post("/update", auth, updateUser)

router.post("/follow", auth, followManager)

export default router