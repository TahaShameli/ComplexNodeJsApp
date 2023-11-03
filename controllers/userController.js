const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')

// api
exports.apiLogin = (req, res) => {
    let user = new User(req.body)
    user.login()
    .then((result) => {
        res.json(jwt.sign({
            _id: user.data._id
        }, process.env.JWTSECRET, {
            expiresIn: '7d' // 1d(day) 1h(hour) 1m(minute) 1s(second)
        }))
    })
    .catch((err) => {
        res.json("didn't log in !")
    })
}

exports.apiGetPostsByUsername = async (req, res) => {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("Sorry, invalid username requested!")
    }
}

// api middlewares
exports.apiMustBeLoggedIn = (req, res, next) => {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("Sorry you must provide a valid token.")
    }
}

// Middlewares
exports.mustBeLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next()
    } else {
        req.flash("errors", "You must be logged in to enter that url.")
        req.session.save(() => {
            res.redirect('/')
        })
    }
}

exports.ifUserExits = (req, res, next) => {
    User.findByUsername(req.params.username)
    .then((userDocument) => {
        req.profileUser = userDocument
        next()
    })
    .catch(() => {
        res.render('404')
    })
}

exports.sharedProfileData = async (req, res, next) => {
    let isVisitorsProfile = false
    let isFollowing = false
    if (req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }

    req.isVisitorsProfile = isVisitorsProfile
    req.isFollowing = isFollowing

    // retrieve post, follower, and following counts
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersByAuthor(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingByAuthor(req.profileUser._id)

    let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])

    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

    next()
}

// Routes
exports.home = async (req, res) => {
    if (req.session.user) {
        // fetch feed of posts for current user
        let posts = await Post.getFeed(req.session.user._id)
        res.render("home-dashboard", { posts })
    } else {
        res.render("home-guest", {
            regErrors: req.flash('regErrors')
        })
    }
}

exports.register = (req, res) => {
    let user = new User(req.body);
    user.register()
    .then(() => {
        req.session.user = {
            username: user.data.username,
            avatar: user.avatar,
            _id: user.data._id
        }
        req.session.save(()=>{
            res.redirect('/')
        })
    })
    .catch((regErrors) => {
        regErrors.forEach((err)=>{
            req.flash('regErrors', err)
        })
        req.session.save(()=>{
            res.redirect('/')
        })
    })
}

exports.login = (req, res) => {
    let user = new User(req.body)
    user.login()
    .then((result) => {
        req.session.user = {
            username: req.body.username,
            avatar: user.avatar,
            _id: user.data._id
        }
        req.session.save(()=>res.redirect('/'))
    })
    .catch((err) => {
        req.flash('errors', err)
        req.session.save(()=>res.redirect('/'))
    })
}

exports.logout = (req, res) => {
    req.session.destroy(()=>res.redirect('/'))
}

exports.profilePostsScreen = (req, res) => {
    // ask our post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id)
    .then((posts) => {
        res.render('profile', {
            posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            currentPage: "posts",
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            },
            title: `${req.profileUser.username}'s posts`
        })
    })
    .catch(() => {
        res.render('404')
    })
}

exports.profileFollowersScreen = async (req, res) => {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
            followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            currentPage: "followers",
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            },
            title: `${req.profileUser.username}'s followers`
        })
    } catch {
        res.render("404")
    }
}

exports.profileFollowingScreen = async (req, res) => {
    try {
        let following = await Follow.getFollowingById(req.profileUser._id)
        res.render('profile-following', {
            following,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            currentPage: "following",
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            },
            title: `${req.profileUser.username}'s following`
        })
    } catch {
        res.render("404")
    }
}

exports.doesUsernameExit = (req, res) => {
    User.findByUsername(req.body.username)
    .then(() => {
        res.json(true)
    })
    .catch(() => {
        res.json(false)
    })
}

exports.doesEmailExist = async (req, res) => {
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}