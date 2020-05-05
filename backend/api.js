require("dotenv").config();
const express = require("express");
const serverless = require("serverless-http");
const mongoose = require("mongoose");

const app = express();

app.use(express.json({ limit: "10mb" }));

const uri = process.env.ATLAS_URI || "mongodb://localhost/commerciale4";
// const uri = "mongodb://localhost/commerciale4";
mongoose.connect(uri, { dbName: "commerciale4", useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });
const connection = mongoose.connection;
connection.once("open", () => {
    console.log("MongoDB database connection established successfully");
});

const companiesRouter = require("./routes/companies");
const adminRouter = require("./routes/admin");

app.use("/.netlify/functions/api/companies", companiesRouter); // path must route to lambda
app.use("/.netlify/functions/api/admin", adminRouter);

module.exports = app;
module.exports.handler = serverless(app);
