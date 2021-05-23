require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mdb = require("./db/MONGODB");
const cookieParser = require("cookie-parser");

const app = express();

const Auth = require("./routes/auth");

mdb.on("error", console.error.bind(console, "connection error:"));

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
