const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema({
  name: String,
  role: String,
  action: String,
  time: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("LoginLog", loginLogSchema);