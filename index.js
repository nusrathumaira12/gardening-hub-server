const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;


app.use(cors())
app.use(express.json())







const uri = `mongodb+srv://${process.env.GARDENINGDB_USER}:${process.env.GARDENINGDB_PASS}@cluster0.qnxzilo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const tipsCollection = client.db('tipDB').collection('tips')
    const usersCollection = client.db('tipDB').collection('users')
    const db = client.db("gardenCommunity");
    const gardenersCollection = db.collection("gardeners")

    app.get('/tips', async(req, res)=> {
const result = await tipsCollection.find({ availability: 'Public' }).toArray();
res.send(result)
    })



    // Top trending tips 
    app.get('/top-tips', async(req,res)=> {
        const topTips = await tipsCollection
        .find({availability: 'Public'})
        .sort({ totalLiked: -1 })
        .limit(6)
        .toArray();
      res.send(topTips);
    })

    // get a single tip by id
    app.get('/tips/:id', async(req, res) => {
        const id = req.params.id;

        try {
            const result = await tipsCollection.findOne({ _id: new ObjectId(id) });
            if (!result) {
              return res.status(404).send({ error: 'Tip not found' });
            }
            res.send(result);
          } catch (error) {
            console.error('Error fetching tip:', error);
            res.status(500).send({ error: 'Server error' });
          }
    })

// get my tips
app.get('/my-tips', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
    
      const userTips = await tipsCollection.find({ email }).toArray();
      res.send(userTips);
  });

//   Delete a tip by Id
app.delete('/tips/:id', async(req, res)=> {
    const id = req.params.id;
  const result = await tipsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
})


// Update a tip by ID
app.put('/tips/:id', async (req, res) => {
    const id = req.params.id;
    const updatedTip = req.body;
  
    try {
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          Title: updatedTip.Title,
          plantType: updatedTip.plantType,
          difficulty: updatedTip.difficulty,
          category: updatedTip.category,
          image: updatedTip.image,
          availability: updatedTip.availability,
          description: updatedTip.description
        }
      };
  
      const result = await tipsCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error('Error updating tip:', error);
      res.status(500).send({ error: 'Failed to update tip' });
    }
  });
  
  

    // patch to increase like
    app.patch("/tips/like/:id", async(req,res) => {
        const tipId = req.params.id;
        const filter = { _id: new ObjectId(tipId)};
        const update = { $inc : {totalLiked: 1}};


        const result = await tipsCollection.updateOne(filter, update)
        res.send(result);
    });

    app.post('/tips', async(req,res)=> {
const newTip = req.body;
console.log(newTip)
const result = await tipsCollection.insertOne(newTip)
res.send(result)
    })

    // get all gardeners
    app.get("/gardeners", async(req, res)=> {
        const all = await gardenersCollection
        .find().toArray();
        res.send(all)
    });

    // get Featured(Active) Gardeners
    app.get("/featured-gardeners", async(req, res)=> {
        const active = await gardenersCollection
        .find({status: "active"})
        .limit(6)
        .toArray()
        res.send(active)
    });

// User related ApI
app.post('/users', async(req,res)=> {
    const userProfile = req.body;
    console.log(userProfile)
    const result = await usersCollection.insertOne(userProfile)
    res.send(result)
})


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=> {
    res.send('Gardening Community server is running.')
})

app.listen(port, () => {
    console.log(`Gardening server is running on port ${port}`)
})
