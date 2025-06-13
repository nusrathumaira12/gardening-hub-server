const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// middleWare
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qnxzilo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// jwt verfication middleware
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader) return res.status(401).send({ message: 'Unauthorized' });

    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Forbidden' });
        req.user = decoded;
        next();
      });
}

async function run() {
  try {
    
    await client.connect();

    const eventsCollection = client.db('athleticEvent').collection('events');
    const bookingsCollection = client.db('athleticEvent').collection('bookings')

    app.post('/events', async(req,res)=> {
        const eventData = req.body;


        const requiredFields = [
            'eventName',
            'eventType',
            'eventDate',
            'description',
            'image',
            'creatorEmail',
            'creatorName',
          ];
          const missingFields = requiredFields.filter(field => !eventData[field]);
    
          if (missingFields.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Missing fields: ${missingFields.join(', ')}`
            });
          }

          const result = await eventsCollection.insertOne(eventData);
          res.status(201).json({
            success: true,
            message: 'Event created successfully',
            insertedId: result.insertedId,
          });

    })
app.get('/events', async(req,res)=> {
    const cursor = eventsCollection.find()
    const result = await cursor.toArray()
    res.send(result)
})

    //featured events api
app.get('/featured-events', async(req, res) => {
  
        const events = await eventsCollection.find().sort({date: 1})
        .limit(6).toArray();
        res.send(events)
   
})

//single event details
app.get('/events/:id', async(req,res)=> {
const id = req.params.id;
const query = {_id : new ObjectId(id)}
const result = await eventsCollection.findOne(query);
res.send(result)
})

app.post('/bookings', verifyJWT, async(req,res) => {
    const booking = req.body;
    const exists = await bookingsCollection.findOne({
        eventId: booking.eventId,
        userEmail: booking.userEmail
    })
    if (exists) {
        return res.status(409).send({ message: 'Already booked this event.' });
      }

      const result = await bookingsCollection.insertOne(booking);
      res.status(201).send(result);
})

app.get('/myBookings', verifyJWT, async(req, res)=> {
    const email = req.query.email;
    if (req.user.email !== email) {
        return res.status(403).send({ message: 'Forbidden' });
      }


      const result = await bookingsCollection.find({ userEmail: email }).toArray();
      res.send(result);
})
 app.delete('/myBookings/:id', verifyJWT, async(req,res) => {
    const id = req.params.id;
    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
 })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('Athlofy Backend is running')
})

app.listen(port, ()=> {
console.log(`Athlofy server is running on port ${port}`)
})