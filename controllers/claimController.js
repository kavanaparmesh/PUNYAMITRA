const Claim = require("../models/Claim");

exports.applyClaim = async (req, res) => {
  try {
    const claim = await Claim.create({
      user: req.user,
      ...req.body,
    });

    res.status(201).json(claim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClaims = async (req, res) => {
  const claims = await Claim.find({ user: req.user });
  res.json(claims);
};