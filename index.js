const express = require("express");
require("dotenv").config();
const axios = require("axios");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();
const givingController = require("./controllers/giving");
const cors = require("cors");
const { PORT, SESSION_SECRET } = process.env;

app.set("view engine", "ejs");

app.use(
  session({
    secret: SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(flash());

app.post("/api/payment", givingController.giving);

app.listen(PORT, () => {
  console.log("server listening on port: ", PORT);
});

module.exports = app;
