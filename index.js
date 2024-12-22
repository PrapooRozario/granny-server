require("dotenv").config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qgpkx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const express = require("express");
const app = express();
const cors = require("cors");
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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
  try {
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    app.get("/foods", async (req, res) => {
      const search = req.query.search || "";
      const result = await foodsCollection
        .find({ foodName: { $regex: search, $options: "i" } })
        .toArray();
      res.send(result);
    });

    app.get("/foods/details/:id", async (req, res) => {
      const { id } = req.params;
      const result = await foodsCollection.findOne({ _id: new ObjectId(id) });
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
