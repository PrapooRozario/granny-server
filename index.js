require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HELLO WORLD!");
});
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(404).send({ massage: "Token not found" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: "Unauthorized access" });
    }
    req.user = decoded;
  });
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qgpkx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  const foodsCollection = client.db("GrannyDB").collection("Foods");
  const testimonialsCollection = client
    .db("GrannyDB")
    .collection("Customer Testimonials");
  const purchasesCollection = client
    .db("GrannyDB")
    .collection("Food Purchases");
  try {
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/foods", async (req, res) => {
      const search = req.query.search || "";
      const result = await foodsCollection
        .find({ foodName: { $regex: search, $options: "i" } })
        .toArray();
      res.send(result);
    });

    app.post("/foods/add", async (req, res) => {
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      res.send(result);
    });

    app.patch("/foods/update/:id", async (req, res) => {
      const { id } = req.params;
      const food = req.body;
      const updatedFood = {
        $set: {
          foodName: food?.foodName,
          foodImage: food?.foodImage,
          foodCategory: food?.foodCategory,
          price: food?.price,
          quantity: food?.quantity,
          foodOrigin: food?.foodOrigin,
          description: food?.description,
        },
      };
      const result = await foodsCollection.updateOne(
        { _id: new ObjectId(id) },
        updatedFood
      );
      res.send(result);
    });

    app.get("/foods/details/:id", async (req, res) => {
      const { id } = req.params;
      const result = await foodsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get(`/foods/add/:email`, verifyToken, async (req, res) => {
      const { email } = req.params;
      if (req.user?.email !== email) {
        return res.status(403).send({ massage: "Forbidden access" });
      }
      const result = await foodsCollection
        .find({ "added_by.email": email })
        .toArray();
      res.send(result);
    });

    app.post("/foods/purchases", async (req, res) => {
      const data = req.body;
      const { job_id, quantity } = req.query || "";
      const quantityInt = parseInt(quantity);
      const result = await purchasesCollection.insertOne(data);

      const updatePurchase = await foodsCollection.updateOne(
        { _id: new ObjectId(job_id) },
        { $inc: { purchaseCount: quantityInt } }
      );

      const updateQuantity = await foodsCollection.updateOne(
        { _id: new ObjectId(job_id) },
        { $inc: { quantity: -quantityInt } }
      );
      res.send(result);
    });

    app.delete("/purchase/delete/:id", async (req, res) => {
      const { id } = req.params;
      const result = await purchasesCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.get("/foods/count/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      if (req.user?.email !== email) {
        return res.status(403).send({ massage: "Forbidden access" });
      }
      const count = await purchasesCollection.countDocuments({
        buyer_email: email,
      });
      res.send({ count });
    });

    app.get("/foods/orders/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      if (req.user?.email !== email) {
        return res.status(403).send({ massage: "Forbidden access" });
      }
      const size = Math.max(parseInt(req.query.size) || 6, 1);
      const page = Math.max(parseInt(req.query.page) || 0, 0);

      const result = await purchasesCollection
        .find({ buyer_email: email })
        .skip(page * size)
        .limit(size)
        .toArray();

      for (const order of result) {
        const food = await foodsCollection.findOne({
          _id: new ObjectId(order?.food_id),
        });

        (order.added_by = food?.added_by),
          (order.foodName = food?.foodName),
          (order.foodImage = food?.foodImage),
          (order.description = food?.description),
          (order.price = food?.price);
      }
      res.send(result);
    });

    app.get("/testimonials", async (req, res) => {
      const result = await testimonialsCollection.find().toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running...");
});
