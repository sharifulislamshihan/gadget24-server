const express = require('express');

const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wsbi62n.mongodb.net/?appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const productCollection = client.db("gadget24").collection("products");
        const categoriesCollection = client.db("gadget24").collection("categories");
        //const cartCollection = client.db("tksBistroDb").collection("carts");
        const userCollection = client.db("gadget24").collection("users");
        const cartCollection = client.db("gadget24").collection("carts");




        // Products related api
        // getting info about Products (find)
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const size = parseInt(req.query.size) || 10;
            const brand = req.query.brand || '';

            let query = {};
            if (brand) {
                query = { brand: { $regex: new RegExp(brand, 'i') } }; // Case insensitive
            }
            console.log(`Received Brand: ${brand}`); // Log received brand for debugging
            console.log(`Query: ${JSON.stringify(query)}`); // Log query for debugging

            const totalProducts = await productCollection.countDocuments(query);
            const result = await productCollection.find(query)
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send({
                result,
                totalProducts,
                totalPages: Math.ceil(totalProducts / size),
            });
        })
        // to see specific id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query);
            //console.log(result);
            res.send(result);
        })

        // DOne: only admin can add Products in the collection
        // added item in the Products collection
        app.post('/products', async (req, res) => {
            const item = req.body;
            const result = await productCollection.insertOne(item);
            res.send(result);
        })

        // to update Products item
        app.patch('/products/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    brand: item.brand,
                    category: item.category,
                    image: item.image,
                    quantity: item.quantity,
                    sold: item.sold,
                    shipping: item.shipping,
                }
            }

            const result = await productCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })




        // delete Products from database
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })


        // category related api
        // getting info about categories (find)
        app.get('/categories', async (req, res) => {
            const result = await categoriesCollection.find().toArray();
            res.send(result);
        })



        // user related API
        app.get('/users', async (req, res) => {
            //console.log(req.headers);
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        // checking the user if its is admin or not
        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        // update users by admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)


        })

        // delete users
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })


        // create new user
        app.post('/users', async (req, res) => {
            const user = req.body;

            // insert email if user doesnot exist
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }

            // inserting email
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // get product from cart
        app.get('carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = cartCollection.find(query).toArray();
            res.send(result);

        })

        // add to cart
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem)
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Gadget24 is running')
})



app.listen(port, () => {
    console.log(`Gadget24 is running at port ${port}`);
})