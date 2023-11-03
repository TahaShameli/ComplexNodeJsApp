const env = require("dotenv")
env.config()
const { MongoClient } = require('mongodb')

const uri = process.env.CONNECTION_STRING

const client = new MongoClient(uri)

async function start() {
    await client.connect()
    exports.client = client
    exports.db = client.db()
    exports.usersCollection = client.db().collection("users")
    exports.postsCollection = client.db().collection("posts")
    exports.followsCollection = client.db().collection("follows")
    const app = require('./app')
    app.listen(process.env.PORT)
}

start()