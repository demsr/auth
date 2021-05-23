const express = require("express");
const router = express.Router();
const jwt = require("express-jwt");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");
const { nanoid } = require("nanoid");
const Redis = require("ioredis");

const redis = new Redis({ keyPrefix: "auth:" });

router.post(
  "/register",
  body("username", "username is required").notEmpty(),
  body("password", "Passwort muss mindestens aus 8 Zeichen bestehen").isLength({
    min: 8,
  }),
  body("password2", "Passwort Wiederholung darf nicht leer sein")
    .not()
    .isEmpty()
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("passwords do not match"),
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).send({
        message: "your form contains errors",
        errors: errors.mapped(),
      });

    User.findOne({ email: req.body.email }, (err, user) => {
      if (err) return res.status(500).send({ message: err });
      if (user)
        return res
          .status(400)
          .send({ message: "User with this email already registered" });

      new User({
        username: req.body.username,
        password: req.body.password,
      }).save((err, _) => {
        if (err)
          return res
            .status(500)
            .send({ message: "could not save user", details: err });
        return res.status(201).send({ message: "user successfull created" });
      });
    });
  }
);

router.post(
  "/login",
  body("username", "empty username").notEmpty(),
  body("password", "empty password").notEmpty(),
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).send({
        message: "your form contains errors",
        errors: errors.mapped(),
      });

    console.log(req.body);

    User.findOne({ username: req.body.username }, (err, user) => {
      if (err) return res.status(500).send({ message: err });
      if (!user) return res.status(400).send({ message: "unknown user" });

      user.comparePassword(req.body.password, async (err, isMatch) => {
        if (err) return res.status(500).send({ message: "server error" });
        if (isMatch) {
          let accesstoken = nanoid(200);

          redis.set(accesstoken, user._id, "EX", 60);

          res.send({
            accesstoken: accesstoken,
          });
        } else {
          res.status(400).send({ message: "wrong password" });
        }
      });
    });
  }
); // => returns Accesstoken (lifetime 5min)

router.post(
  "/accesstoken",
  body("token", "empty token").notEmpty(),
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).send();
    console.log(req.body);
    redis.get(req.body.token, (err, redis_res) => {
      if (err) return res.status(500).send({ message: "Redis error" });

      if (!redis_res) return res.status(404).send({ message: "key not found" });

      User.findById(redis_res, async (err, user) => {
        if (err) return res.status(500).send({ message: "err getting jwt" });
        if (!user)
          return res.status(404).send({ message: " could not find user" });

        let jwt = await user.generateJWT();
        let refreshtoken = nanoid(200);
        redis.set(refreshtoken, user._id);

        res.cookie("refreshtoken", refreshtoken, { httpOnly: true });
        res.send({ jwt: jwt });
        redis.del(req.body.token);
      });
    });
  }
); // => returns refreshtoken (cookie) + jwt

router.get(
  "/refreshtoken",

  (req, res) => {
    console.log("Request: ", req);

    redis.get(req.cookies.refreshtoken, (err, redis_res) => {
      if (err) return res.status(500).send({ message: "Redis error" });

      if (!redis_res) return res.status(404).send({ message: "key not found" });

      User.findById(redis_res, async (err, user) => {
        if (err) return res.status(500).send({ message: "err getting jwt" });
        if (!user)
          return res.status(404).send({ message: " could not find user" });

        let jwt = await user.generateJWT();
        let refreshtoken = nanoid(200);
        redis.set(refreshtoken, user._id);

        res.cookie("refreshtoken", refreshtoken, { httpOnly: true });
        res.send({ jwt: jwt });
        redis.del(req.cookies.refreshtoken);
      });
    });
  }
); // => returns refreshtoken (cookie) + jwt

module.exports = router;
