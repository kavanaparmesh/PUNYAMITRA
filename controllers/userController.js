const User = require("../models/User");
const LoginLog = require("../models/LoginLog");

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user).select("-password");
  res.json(user);
};

exports.completeProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user,
    req.body,
    { new: true }
  );

  await LoginLog.create({
    name: user.name || "User",
    role: "User",
    action: "Updated Profile"
  });

  res.json(user);
};