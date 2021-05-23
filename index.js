require("dotenv").config();
const express = require("express");
const moment = require("moment");
const Redis = require("ioredis");
const cors = require("cors");
const mdb = require("./db/MONGODB");
const redis = new Redis({ keyPrefix: "auth:" });
const cookieParser = require("cookie-parser");
const { body, validationResult } = require("express-validator");

const app = express();

const Auth = require("./routes/auth");

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.set("trust proxy", true);

app.use("/auth", Auth);

mdb.once("open", function () {
  console.log("MongoDB connected");
  app.listen(process.env.PORT, () => {
    console.log(`running on port ${process.env.PORT}`);
  });
});
