const express = require("express");
require("dotenv").config();
const session = require("express-session");
const flash = require("connect-flash");
const app = express();
const givingController = require("./controllers/giving");
const cors = require("cors");
const { PORT, SESSION_SECRET, ALLOWED_ORIGIN } = process.env;

app.set("view engine", "ejs");

app.use(
  session({
    secret: SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // session/cookie
  })
);

app.use(express.json());
app.use(flash());

app.post("/api/payment", givingController.giving);

app.listen(PORT, () => {
  console.log("server listening on port: ", PORT);
});

module.exports = app;
