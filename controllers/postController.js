const Post = require('../models/Post')

// api
exports.apiCreate = (req, res) => {
    let post = new Post(req.body, req.apiUser._id)
    post.create()
    .then(() => {
        res.json(post.data)
    })
    .catch((errors) => {
        res.json(errors)
    })
}

exports.apiDelete = (req, res) => {
    Post.delete(req.params.id, req.apiUser._id)
    .then(() => {
        res.json("Success")
    })
    .catch((error) => {
        res.json("You do not have permission to perform that action!")
    })
}

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id)
    post.create()
    .then((newId) => {
        req.flash("success", "New post created successfully!")
        req.session.save(() => res.redirect(`/post/${newId}`))
    }) 
    .catch((errors) => {
        errors.forEach(err => req.flash("errors", err))
        req.session.save(() => res.redirect('/create-post'))
    })
}

exports.viewSingle = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', {
            post,
            title: post.title
        })
    } catch {
        res.render('404')
    }
}

exports.viewCreateScreen = (req, res) => {
    res.render('create-post', {
        title: `create post`
    })
}

exports.viewEditScreen = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        if (post.isVisitorOwner) {
            res.render('edit-post', {
                post,
                title: `edit post`
            })
        } else {
            req.flash("errors", "You do not have permission to perform that action!")
            req.session.save(() => res.redirect('/') )
        }
    } catch {
        res.render('404')
    }
}

exports.edit = (req, res) => {
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update()
    .then((status) => {
        // the post was successfuly updated to the database
        // or user did have permission, but there were validation errors
        if (status == "success") {
            // post was updated in db
            req.flash("success", "Post successfully updated!")
            req.session.save(() => {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            // there were validation errors
            post.errors.forEach((err) => {
                req.flash('errors', err)
            })
            req.session.save(() => {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    })
    .catch(() => {
        // a post with the requested id doesn't exist
        // or if the current visitor is not the owner of requested post
        req.flash("errors", "You do not have permission to perform that action!")
        req.session.save(() => {
            res.redirect('/')
        })
    })
}

exports.delete = (req, res) => {
    Post.delete(req.params.id, req.visitorId)
    .then(() => {
        req.flash('success', "Post successfully deleted!")
        req.session.save(() => res.redirect(`/profile/${req.session.user.username.toLowerCase()}`))
    })
    .catch((error) => {
        req.flash("errors", "You do not have permission to perform that action!")
        req.session.save(() => res.redirect('/'))
    })
}

exports.search = (req, res) => {
    Post.search(req.body.searchTerm)
    .then( posts => {
        res.json(posts)
    })
    .catch(() => {
        res.json([])
    })
}