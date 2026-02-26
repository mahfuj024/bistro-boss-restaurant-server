import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ✅ Configure CORS properly
app.use(cors({
  origin: "https://bistro-boss-restaurant-3f7b2.web.app", // allow frontend origin
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors()); // preflight OPTIONS request
app.use(express.json());

// MongoDB URI
const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully ✅");

    const database = client.db("Bistro-boss-restaurant");
    const userCollection = database.collection("user");
    const menuCollection = database.collection("menu");
    const cartCollection = database.collection("cart");

    // ✅ JWT token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    // ✅ verify JWT token
    const verifyJwtToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).send({ message: "Unauthorized access" });

      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ error: true, message: "Forbidden access" });
        req.decoded = decoded;
        next();
      });
    };

    // ✅ verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });
      if (!user || user.role !== "admin") return res.status(403).send({ message: "Forbidden access" });
      next();
    };

    // ✅ Make admin
    app.patch("/user/admin/:id", verifyJwtToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin" } }
      );
      res.send(result);
    });

    // ✅ Get admin by email
    app.get("/user/admin/:email", verifyJwtToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) return res.status(403).send({ message: "Forbidden access" });
      const user = await userCollection.findOne({ email });
      res.send({ admin: user?.role === "admin" || false });
    });

    // ✅ Get all users
    app.get("/user", verifyJwtToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // ✅ Save user
    app.post("/user", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) return res.send({ message: "User already exists", insertedId: null });
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // ✅ Delete user
    app.delete("/user/:id", verifyJwtToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ✅ Get all menu
    app.get("/menu", async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });

    // ✅ Get menu by id
    app.get("/menu/:id", async (req, res) => {
      try {
        const result = await menuCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!result) return res.status(404).send({ message: "Item not found" });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ✅ Add new menu item
    app.post("/menu", verifyJwtToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body;
      if (!menuItem || !menuItem.name) return res.status(400).send({ message: "Invalid data" });
      const result = await menuCollection.insertOne(menuItem);
      res.send(result);
    });

    // ✅ Delete menu item
    app.delete("/menu/:id", verifyJwtToken, verifyAdmin, async (req, res) => {
      const result = await menuCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    // ✅ Get cart by email
    app.get("/cart", verifyJwtToken, async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email query is required" });
      const cart = await cartCollection.find({ email }).toArray();
      res.send(cart);
    });

    // ✅ Save cart
    app.post("/cart", async (req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });

    // ✅ Delete cart
    app.delete("/cart/:id", verifyJwtToken, async (req, res) => {
      const result = await cartCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    console.log("All routes setup successfully ✅");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("Express server running successfully");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});