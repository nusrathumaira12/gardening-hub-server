const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken'); 
const app = express();
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// middleWare
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const logger = (req,res,next) => {
    console.log('inside the logger middleware');
    next()
}

const verifyToken = (req,res,next) => {
    const token = req?.cookies?.token ;
    if(!token) return res.status(401).send({ message: 'unauhtorized access' })

jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=> {
    if(err) return   res.status(403).send({ message: 'Forbidden - Invalid token' });
    req.decoded = decoded
    next();
})
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qnxzilo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// // jwt verification middleware
// const verifyJWT = (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if(!authHeader) return res.status(401).send({ message: 'Unauthorized' });

//     const token = authHeader.split(' ')[1]
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//         if (err) return res.status(403).send({ message: 'Forbidden' });
//         req.user = decoded;
//         next();
//       });
// }

async function run() {
  try {
    
    await client.connect();

    const db = client.db('athleticEvent');
    const eventsCollection = db.collection('events');
    const bookingsCollection = db.collection('myBookings');

    // jwt token related api
    app.post('/jwt', async(req, res)=> {
        const userInfo = req.body;

        const token = jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.cookie('token', token,{
            httpOnly: true,
            secure: false,
             sameSite: 'strict',
        })
        res.send({success: true})
    })

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
    app.get('/events', async (req, res) => {
        const result = await eventsCollection.find().toArray();
        res.send(result);
      });

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

// manage events
app.get('/myCreatedEvents', verifyToken, async(req, res) => {
    const email = req.query.email;
    if(!email) return res.status(400).send({message: 'Email required'})
     if(req.decoded.email !== email)  return  res.status(403).send({ message: 'Forbidden' })

        const result = await eventsCollection.find({ creatorEmail : email}).toArray();
        res.send(result);
})

// delete events
app.delete('/events/:id', verifyToken, async(req, res)=> {
    const id = req.params.id;
    const email = req.decoded.email;

    const event = await eventsCollection.findOne({_id : new ObjectId(id)})
    if (!event) return res.status(404).send({ message: 'Event not found' });
    if(event.creatorEmail !== email) return res.status(403).send({ message: 'Forbidden - Not your event' });

    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result);
})

// update Event
app.patch('/events/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const email = req.decoded.email;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) return res.status(404).send({ message: 'Event not found' });
    if (event.creatorEmail !== email) return res.status(403).send({ message: 'Forbidden - Not your event' });

    const updatedEvent = req.body;
    const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedEvent }
    );

    res.send(result);
});

  // ✅ Book an event
  app.post('/bookings', async (req, res) => {
    const booking = req.body;

    if (!booking.userEmail || !booking.eventId) {
      return res.status(400).send({ message: 'Missing userEmail or eventId' });
    }

    const exists = await bookingsCollection.findOne({
      eventId: booking.eventId,
      userEmail: booking.userEmail
    });

    if (exists) {
      return res.status(409).send({ message: 'Already booked this event.' });
    }

    const result = await bookingsCollection.insertOne(booking);
    res.status(201).send(result);
  });


app.get('/myBookings', verifyToken, async(req, res)=> {
    const email = req.query.email;

    if (!email) return res.status(400).send({ message: 'Email query is required' });
    if (req.decoded.email !== email) return res.status(403).send({ message: 'Forbidden' });

      const result = await bookingsCollection.find({  userEmail: email}).toArray();
      res.send(result);
})
 app.delete('/myBookings/:id',verifyToken,  async(req,res) => {
    const id = req.params.id;
    const email = req.decoded.email;

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).send({ message: 'Booking not found' });
    if (booking.userEmail !== email) {
        return res.status(403).send({ message: 'Forbidden - Not your booking' });
    }
    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
 })


    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
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