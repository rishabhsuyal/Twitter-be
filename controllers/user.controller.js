import CryptoJS from "crypto-js"
import jwt from "jsonwebtoken"
import path  from "path"
import sharp  from 'sharp'
import fs  from "fs"
import { v4 }  from 'uuid'

import userSchema from "../schemas/user.js"
import Tweet from "../schemas/tweet.js"

function uid() {
    return new Date(Date.now()).getTime() + Math.floor(Math.random() * (99 + 10) + 10)
}

// Login
export const login = async (req, res) => {
    const { username, password } = req.body
    if (!username || !password)
        return res.status(400).send("Error in field")
    const user = await userSchema.findOne({ username: username })
    if (!user)
        return res.status(404).send("User not found")
    const tokenCreated = jwt.sign({ id: user.id, username: username, password: password }, process.env.secretKey, { expiresIn: '24h' });

    res.send({
        username: user.username,
        name: user.name,
        id: user.id,
        photo: user.photo,
        banner: user.banner,
        description: user.description,
        followers: user.followers,
        following: user.following,
        token: tokenCreated
    })
}

// Create Account
export const register = async (req, res) => {
    const { username, password, mail, name } = req.body
    if (!username || !password || !mail || !name) return res.status(400).send("Error in field")
    const createUID = uid()

    const newUser = new userSchema({
        name: name,
        id: createUID,
        username: username,
        password: password,
        mail: mail,
        date: Date.now().toString(),
        description: '',
        photo: null,
        banner: null,
        followers: [],
        following: []
    })
    await newUser.save();
    const createdUser = await userSchema.findOne({ id: createUID })
    if (!createdUser) return res.status(500).send("Username taken")

    const tokenCreated = jwt.sign({ id: createUID, username: username, password: password }, process.env.secretKey, { expiresIn: '24h' });

    res.send({
        username,
        name,
        id: createUID,
        description: '',
        photo: null,
        banner: null,
        followers: [],
        following: [],
        token: tokenCreated
    })
}

// Login with token
export const logintoken = async (req, res) => {
    const { token } = req.body

    const decodedCode = jwt.verify(token, process.env.secretKey)
    if (!decodedCode) return res.status(401).send("Unauthorized access")

    const user = await userSchema.findOne({ id: decodedCode.id })
    if (!user) return res.status(404).send("User not found");

    res.send({
        username: user.username,
        name: user.name,
        id: user.id,
        photo: user.photo,
        banner: user.banner,
        description: user.description,
        followers: user.followers,
        following: user.following,
        token: token
    })
}

// Get all tweets
export const getHome = async (req, res) => {
    const tweets = await Tweet.find({})
    res.send(tweets.reverse())
}
export const getHomeOwn = async (req, res) => {
    const { following } = req.body;
    var allTweets=[];
    if(following.length>0){
        for (let x in following){
            const user = await userSchema.findOne({id:following[x]})
           const tweets = await Tweet.find({ user: user.id })
           allTweets=[...allTweets,...tweets];
          }
    }
    res.send(allTweets.reverse())
}

// Get user information with optional query
export const getUser = async (req, res) => {
    const { id, username } = req.query
    if (!id && !username) return res.status(406).send("Error in feilds")

    var search = id ? { id } : { username }


    const user = await userSchema.findOne(search)
    if (!user) return res.status(404).send("User Not found.")

    res.send({
        username: user.username,
        name: user.name,
        photo: user.photo,
        banner: user.banner,
        id: user.id,
        description: user.description,
        followers: user.followers,
        following: user.following
    })
}

// Get specific tweets
export const getUserTweets = async (req, res) => {
    const { user } = req.query

    if (!user) return res.status(406).send("Tweet Not Found")
    const tweets = await Tweet.find({ user: user })
    res.send(tweets.reverse())
}

// Create a tweet
export const createTweet = async (req, res) => {
    const { user, date, content } = req.body

    if (!user || !date || !content) return res.status(500).send("Error in body passed")
    if (content.length < 3) return res.status(500).send("Content lenght is short")

    const tweet = new Tweet({
        user,
        date,
        content,
        likes: '0'
    })
    await tweet.save()

    res.sendStatus(200)
}

//delete tweet
export const deleteTweet = async (req, res) => {
    console.log("entered");
    const { id } = req.body
    if (!id) return res.status(500).send("Error in body passed")
    
    const tweet = await Tweet.findById(id);
    if (!tweet) return res.status(500).send("tweet Not Found");

    const deletedTweet = await Tweet.deleteOne({_id:id});

    if(!deletedTweet) return res.status(500).send("tweet Not Found");

    return res.status(200).send("Tweet Deleted");
}

export const editTweet = async(req, res) =>{
    console.log("triggered");
    const { id, content } = req.body
    if (!content) return res.status(500).send("Err in body passed")

    const tweet = await Tweet.findById(id);
    if (!tweet) return res.status(500).send("Tweet Not Found")

    tweet.content = content;
    await tweet.save()
    res.send({
        id,
        content
    })
}

// Upadate personal information
export const updateUser = async (req, res) => {
    const { id, description, name } = req.body
    if (!id || description?.length < 3 || name?.length < 3) return res.status(500).send("Err in body passed")

    const user = await userSchema.findOne({ id })
    if (!user) return res.status(500).send("User Not Found")

    user.description = description
    user.name = name

    await user.save()

    res.send({
        description,
        name
    })
}

// Follow and Unfollow Route
export const followManager = async (req, res) => {
    const { followToId, id } = req.body

    const user = await userSchema.findOne({ id })
    if (!user) return res.status(500).status("Err")

    const followTo = await userSchema.findOne({ id: followToId })
    if (!followTo) return res.status(500).status("Err")

    if (user.following.includes(followTo.id)) user.following = user.following.filter(id => id !== followTo.id)
    else user.following.push(followTo.id);

    if (followTo.followers.includes(user.id)) followTo.followers = followTo.followers.filter(id => id !== user.id)
    else followTo.followers.push(user.id);

    await user.save()
    await followTo.save()

    res.send({
        followToUser: {
            following: followTo.following,
            followers: followTo.followers
        },
        user: {
            following: user.following,
            followers: user.followers
        }
    })
}

// Upload personal images
// export const uploadImages = async (req, res) => {
//     var sendForData = {
//         banner: null,
//         photo: null
//     }

//     const user = await userSchema.findOne({ id: req.files[0].originalname.split("-")[1] })
//     if (!user) return res.status(500).send("err")


//     for (let i = 0; i < req.files.length; i++) {
//         const file = req.files[i];
//         let data = file.originalname.split("-")
//         // data[0] = type (banner / profile)
//         // data[1] = user id

//         try {
//             let isHasPhoto = user[data[0]]?.split('/').pop()
//             // in database data => http://localhost:3030/xxx.webp, we split from '/' and select last item with pop() so we obtained img name.
//             // transaction result => xxx.webp

//             if (isHasPhoto) fs.unlinkSync(path.resolve() + `\\images\\${isHasPhoto}`);
//             // output => 'C:\\Users\\xxx\\xxx\\twitter-api\\xxx.webp' 
//         } catch (error) {
//             console.log("Old photo could not be deleted")
//         }

//         const newName = `${v4()}.webp`
//         const sizes = {
//             width: data[0] == 'banner' ? 600 : 300,
//             height: 300
//         }
//         await sharp(file.buffer).resize(sizes).toFile(`./images/${newName}`);

//         const imgPath = `http://localhost:3030/images/${newName}`
//         user[data[0]] = imgPath
//         sendForData[data[0]] = imgPath
//         if (i == req.files.length - 1) send()
//     }

//     function send() {
//         user.save()
//         res.send(sendForData)
//     }
// }