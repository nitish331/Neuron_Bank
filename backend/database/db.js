const mongoose = require("mongoose");

const db = mongoose.connect(process.env.MONGODB_URI)

const db = db.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));


db.once("open", function () {
  console.log("Connected to MongoDB");
});
