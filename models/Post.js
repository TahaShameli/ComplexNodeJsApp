const { postsCollection, followsCollection } = require('../db')
const User = require('./User')

const ObjectId = require('mongodb').ObjectId
const sanitizaHTML = require('sanitize-html')

let Post = function(data, userid, requestedPostId) {
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function() {
    if (typeof(this.data.title) != "string") {
        this.data.title = ""
    }
    if (typeof(this.data.body) != "string") {
        this.data.body = ""
    }

    // get rid of any bogus property
    this.data = {
        title: sanitizaHTML(this.data.title.trim(), {
            allowedTags: [],
            allowedAttributes: []
        }),
        body: sanitizaHTML(this.data.body.trim(), {
            allowedTags: [],
            allowedAttributes: []
        }),
        createdDate: new Date(),
        author: new ObjectId(this.userid)
    }
}

Post.prototype.validate = function() {
    if (this.data.title == "") {
        this.errors.push("You must provide a title")
    }
    if (this.data.body == "") {
        this.errors.push("You must provide some content for the post")
    }
}

Post.prototype.create = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()

        if (!this.errors.length) {
            postsCollection.insertOne(this.data)
            .then((info) => {
                resolve(info.insertedId)
            })
            .catch(() => {
                this.errors.push("Sorry, something was wrong, please try again later.")
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

Post.prototype.update = function() {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(this.requestedPostId, this.userid)
            if (post.isVisitorOwner) {
                // actually update the db
                let status = await this.actuallyUpdate()
                resolve(status)
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            await postsCollection.findOneAndUpdate({_id: new ObjectId(this.requestedPostId)}, {
                $set: {
                    title: this.data.title,
                    body: this.data.body
                }
            })
            resolve("success")
        } else {
            resolve("failure")
        }
    })
}

Post.findSingleById = function(id, visitorId) {
    return new Promise(async (resolve, reject) => {
        if (typeof(id) != "string" || !ObjectId.isValid(id)) {
            reject()
            return
        }
        
        let posts = await Post.reusablePostQuery([
            {$match: {
                _id: new ObjectId(id)
            }}
        ], visitorId)

        if (posts.length) {
            resolve(posts[0])
        } else {
            reject()
        }
    })
}

Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperations = []) {
    return new Promise(async (resolve, reject) => {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "authorDocument"
            }},
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,
                authorId: "$author",
                author: {
                    $arrayElemAt: ["$authorDocument", 0]
                }
            }}
        ]).concat(finalOperations)

        let posts = await postsCollection.aggregate(aggOperations).toArray()

        // clean up other property in each post object
        posts = posts.map((post) => {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.authorId = undefined

            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
                // isVisitorid: 
            }

            return post
        })

        resolve(posts)
    })
}

Post.findByAuthorId = (authorId) => {
    return Post.reusablePostQuery([
        {$match: {
            author: authorId
        }},
        {$sort: {
            createdDate: -1 // 1 -> ascending & -1 -> descending
        }}
    ])
}

Post.delete = (postIdToDelete, currentUserId) => {
    return new Promise( async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(postIdToDelete, currentUserId)
            if (post.isVisitorOwner) {
                await postsCollection.deleteOne({_id: new ObjectId(postIdToDelete)})
                resolve()
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}

Post.search = searchTerm => {
    return new Promise(async (resolve, reject) => {
        if (typeof(searchTerm) == "string") {
            let posts = await Post.reusablePostQuery([{
                $match: { $text: {
                    $search: searchTerm
                }}
            }], undefined, {
                $sort: { score: {
                    $meta: "textScore"
                }}
            })
            resolve(posts)
        } else {
            reject()
        }
    })
}

Post.countPostsByAuthor = id => {
    return new Promise( async (resolve, reject) => {
        let postCount = await postsCollection.countDocuments({ author: id })
        resolve(postCount)
    })
}

Post.getFeed = async id => {
    // create an array of the user ids that the current user follows
    let followedUsers = await followsCollection.find({ authorId: new ObjectId(id) }).toArray()
    followedUsers = followedUsers.map( followDoc => followDoc.followedId )
    
    // look for posts where the author is in the above array of followed users
    return Post.reusablePostQuery([
        // this bellow line means: find any post document, where the author value, is a value that is in our array of followedUsers :)))
        {$match: { author: { $in: followedUsers } }}
    ], {
        // -1 means the newest values
        $sort: { createdDate: -1 }
    })
}

module.exports = Post