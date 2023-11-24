const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config();
const {MongoClient,ServerApiVersion} = require('mongodb');
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
        // const userCollection = client.db(byteskillDB).collection('users');







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