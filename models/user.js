var mongoose = require("mongoose");
const moment = require("moment");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
var Schema = mongoose.Schema;

var privateKEY = fs.readFileSync("./private.key", "utf8");

const UserSchema = new Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  refreshToken: [{ type: String }], // redis key, does not contain token!
});

UserSchema.pre("save", function (next) {
  let user = this;
  // only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  // generate a salt
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err);

    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);

      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

UserSchema.methods.generateJWT = async function (ipadress) {
  var today = new Date();

  // let u = await this.populate("permissions").execPopulate();

  return jwt.sign(
    {
      id: this._id,
      name: this.name,
      username: this.email,
      //  permissions: u.permissions.map((p) => p.permission),
      exp: moment().add(5, "minutes").toDate() / 1000,
    },
    privateKEY,
    { algorithm: "RS256" }
  );
};

module.exports = mongoose.model("User", UserSchema);
