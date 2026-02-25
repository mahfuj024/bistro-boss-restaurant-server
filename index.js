import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config(); // .env load

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
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

// Connect to MongoDB
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

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ error: true, message: "Forbidden access" });
        }
        req.decoded = decoded;
        next(); // route access 
      });
    }

    // ✅ verify admin (use verify admin after use verify token)
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === "admin"

      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next()
    }

    // ✅ Make admin
    app.patch("/user/admin/:id", verifyJwtToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "admin" } };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // ✅ Get admin
    app.get("/user/admin/:email", verifyJwtToken, async (req, res) => {
      const email = req.params.email

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })

    // ✅ Get all users
    app.get("/user", verifyJwtToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // ✅ Save user
    app.post("/user", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) return res.send({ message: "user already exists", insertedId: null });
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
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // ✅ Get menu item by id
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id

      try {
        const query = { _id: new ObjectId(id) }
        const result = await menuCollection.findOne(query)

        if (!result) {
          return res.status(404).send({ message: "Item not found" })
        }

        res.send(result)
      } catch (error) {
        console.error(error)
        res.status(500).send({ message: "Server error" })
      }
    })

    // ✅ Add new cart in menuCollection
    app.post("/menu", verifyJwtToken, verifyAdmin, async (req, res) => {
      try {
        const cart = req.body;
        if (!cart || !cart.name) {
          return res.status(400).send({ message: "Invalid data" });
        }

        const result = await menuCollection.insertOne(cart);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // ✅ Delete menu item
    app.delete("/menu/:id", verifyJwtToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const result = await menuCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // ✅ Get cart by email
    app.get("/cart", verifyJwtToken, async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email query is required" });
      const result = await cartCollection.find({ email }).toArray();
      res.send(result);
    });

    // ✅ Save cart
    app.post("/cart", async (req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });

    // ✅ Delete cart
    app.delete("/cart/:id", verifyJwtToken, async (req, res) => {
      const id = req.params.id;
      const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

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