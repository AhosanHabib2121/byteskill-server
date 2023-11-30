const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express()
const {MongoClient,ServerApiVersion, ObjectId} = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000


// middleware
app.use(cors({
    origin: [
        'https://byteskill-ce962.web.app',
        'https://byteskill-ce962.firebaseapp.com'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


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
        const teacherRequestCollection = client.db('byteskillDB').collection('teacherRequest');
        const addClassCollection = client.db('byteskillDB').collection('addClass');

        // --------------middleware--------
        // verifyToken
        const verifyToken = (req, res, next) => {
            const token = req?.cookies?.token;
            

            if (!token) {
                return res.status(401).send({message: 'Unauthorized access'})
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({message: 'Unauthorized access'})
                }
                req.user = decoded;
                next();
            });
        }
        // verify admin token
        const adminVerify = async (req, res, next) => {
            const email = req?.user?.email;
            const query = {
                email: email
            };
            const user = await userCollection.findOne(query);
            const isAdmin = user.role == 'admin';
            if (!isAdmin) {
                return res.status(403).send({message: 'forbidden access'})
            }
            next();
        }


        // ----------JWT token api----------------
         app.post('/jwt', async (req, res) => {
             const user = req.body;
             const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                 expiresIn: '1h'
             })
             res.cookie('token', token, {
                     httpOnly: true,
                     secure: process.env.NODE_ENV === 'production',
                     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                 })
                 .send({
                     success: true
                 })
         })
        
        // logout and clear cookies data
        app.post('/logout', async (req, res) => {
            const user = req.body;
            res
                .clearCookie('token', {
                    maxAge: 0
                })
                .send({
                    success: true
                })
        })


        //---------- user collection here--------
        app.get('/api/user', verifyToken, adminVerify, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/api/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })
        app.put('/api/user/:email', async (req, res) => {
            const email = req.params.email;
            const numberData = req.body;
            const filter = { email: email };
            const options = {
                upsert: true
            };
            const updateDoc = {
                $set: {
                    number: numberData?.number
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.get('/api/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const user = await userCollection.findOne(query);

            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({
                admin
            })
        })

        app.get('/api/user/teacherAdmin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const user = await userCollection.findOne(query);
            let teacherAdmin = false;
            if (user) {
                teacherAdmin = user ?.role === 'teacher'
            }
            res.send({
                teacherAdmin
            })
        })

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

        app.patch('/api/user/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id)};
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // ----------- teacherRequest collection here ----------
        app.get('/api/teacher/request', verifyToken, async (req, res) => {
            const result = await teacherRequestCollection.find().toArray();
            res.send(result);
        })
        
        app.post('/api/teacher/request', async (req, res) => {
            const teacherData = req.body;
            const result = await teacherRequestCollection.insertOne(teacherData);
            res.send(result);
        })
        // teacher request approved here
        app.patch('/api/teacher/request/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)}
            const requestData = await teacherRequestCollection.findOne(filter);
            const updateStatus = {
                $set: {
                    status: 'accepted'
                }
            }
            const statusUpdate = await teacherRequestCollection.updateOne(filter,updateStatus)

            if (statusUpdate) {
                const query = {
                    email: requestData?.email
                }
                const user = await userCollection.findOne(query);
                 const updatedRole = {
                     $set: {
                         role: 'teacher'
                     }
                 }
                const result = await userCollection.updateOne(user, updatedRole);

                res.send(result);
            }

        })
        // teacher request reject here
        app.patch('/api/teacher/request/reject/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)}
            const updateStatus = {
                $set: {
                    status: 'rejected'
                }
            }
            const result = await teacherRequestCollection.updateOne(filter, updateStatus);
            res.send(result);

        })
        // --------------addClass Collection here---------------
        app.get('/addClass', async (req, res) => {
            const result = await addClassCollection.find().toArray();
            res.send(result);
        })

        app.get('/classesDetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addClassCollection.findOne(query);
            res.send(result);
        })

        app.get('/addClass/approved', async (req, res) => {
            const query ={status: 'approved'}
            const result = await addClassCollection.find(query).toArray();
            res.send(result);
        })
        // add class approved here
        app.patch('/addClass/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            }
            const updateStatus = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await addClassCollection.updateOne(filter, updateStatus);
            res.send(result);

        })

        app.post('/addClass', async (req, res) => {
            const data = req.body;
            const result = await addClassCollection.insertOne(data);
            res.send(result);
        })

        // create-payment-intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
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