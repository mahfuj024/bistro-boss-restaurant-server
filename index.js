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
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully ✅");
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
