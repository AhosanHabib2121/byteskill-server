const express = require('express')
const cors = require('cors')
const app = express()
const {MongoClient,ServerApiVersion} = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000


// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.frkz6qo.mongodb.net/?retryWrites=true&w=majority`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // collection here
        const userCollection = client.db('byteskillDB').collection('users');


        // user collection here
        app.post('/api/user', async(req, res) => {
            const user = req.body;
            const query = {email: user.email};
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({
                    message: 'user already exists',
                    insertedId: null
                })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.patch('/api/user', async (req, res) => {
            const user = req.body;
            const filter = {
                email: user.email
            };
            const updateData = {
                $set: {
                    lastLoginAt: user.lastLoginAt,
                }
            }
            const result = await userCollection.updateOne(filter, updateData);
            res.send(result);

        })







        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('ByteSkill server on');
})
app.listen(port, () => {
    console.log(`byteskill server on port ${port}`);
})