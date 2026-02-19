// Load environment variables first
import dotenv from "dotenv";
dotenv.config();

// Import packages
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI from .env
const uri = process.env.DB_URI;

// Create MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully ✅");

    const database = client.db("Bistro-boss-restaurant");
    const menuCollection = database.collection("menu");
    const cartCollection = database.collection("cart");

    // Get all menu data
    app.get("/menu", async (req, res) => {
      try {
        const result = await menuCollection.find().toArray()
        res.send(result)
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch menu data" })
      }
    })

    // Get cart by email id
    app.get("/cart", async (req, res) => {
      const email = req.query.email

      if (!email) {
        return res.status(400).send({ error: "Email query is required" });
      }

      const query = { email: email }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    // Save cart in database
    app.post("/cart", async (req, res) => {
      const cart = req.body
      const result = await cartCollection.insertOne(cart)
      res.send(result)
    })



  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}
run().catch(console.dir);


// Routes
app.get("/", (req, res) => {
  res.send("Express server running successfully");
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
