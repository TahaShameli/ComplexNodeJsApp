const Follow = require('../models/Follow')

exports.addFollow = (req, res) => {
    let follow = new Follow(req.params.username, req.visitorId)
    follow.create()
    .then(() => {
        req.flash("success", `You are now following ${req.params.username}`)
        req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    })
    .catch((errors) => {
        console.log("not created");
        errors.forEach(err => {
            req.flash("errors", err)
        });
        req.session.save(() => res.redirect('/'))
    })
}

exports.removeFollow = (req, res) => {
    let follow = new Follow(req.params.username, req.visitorId)
    follow.delete()
    .then(() => {
        req.flash("success", `You stopped following ${req.params.username}`)
        req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    })
    .catch((errors) => {
        errors.forEach(err => {
            req.flash("errors", err)
        });
        req.session.save(() => res.redirect('/'))
    })
}