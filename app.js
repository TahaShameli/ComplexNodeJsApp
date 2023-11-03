const express = require("express")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const markdown = require("marked")
const csrf = require("csurf")
const app = express()
const sanitizeHTML = require("sanitize-html")

const { client } = require('./db')

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.static('public'))

app.use('/api', require('./router-api'))

let sessionOptions = session({
    secret: "Javascript is so cooool!",
    store: MongoStore.create({client}),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours :)))
        httpOnly: true
    }
})

app.use(sessionOptions)
app.use(flash())

app.use((req, res, next) => {
    // make our markdown function available from within ejs templates
    res.locals.filterUserHTML = (content) => {
        return sanitizeHTML(markdown.parse(content), {
            allowedAttributes: [],
            allowedTags: ['p', 'br', 'strong', 'b', 'bold', 'i', 'em', 'sub', 'sup', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        })
    }

    // make all error success flash messages available from all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")

    // make user id available from within the req object
    if (req.session.user) {
        req.visitorId = req.session.user._id
    } else {
        req.visitorId = 0
    }

    // make user session data available from within view templates
    res.locals.user = req.session.user
    next()
})

const router = require("./router")

app.set('views', 'views')
app.set('view engine', 'ejs')

app.use(csrf())
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/', router)

app.use((err, req, res, next) => {
    if (err) {
        if (err.code == "EBADCSRFTOKEN") {
            console.log("CSRF was wased");
            req.flash("errors", "Cross-Site Request Fogery detected!")
            req.session.save(() => res.redirect('/'))
        } else {
            res.render("404")
        }
    }
})

const server = require("http").createServer(app)

const io = require("socket.io")(server)

io.use((socket, next) => {
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', socket => {
    if (socket.request.session.user) {
        let user = socket.request.session.user

        socket.emit("welcome", {
            username: user.username,
            avatar: user.avatar
        })

        socket.on('chatMessageFromBrowser', (data) => {
            socket.broadcast.emit('chatMessageFromServer', {
                message: sanitizeHTML(data.message, {
                    allowedTags: [],
                    allowedAttributes: []
                }),
                username: user.username,
                avatar: user.avatar
            })
        })
    }
})

module.exports = server;