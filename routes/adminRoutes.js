const express = require("express");
const router = express.Router();
const LoginLog = require("../models/LoginLog");

// ✅ NEW LOG ROUTE
router.get("/admin-logs", async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .sort({ time: -1 })
      .limit(20);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

module.exports = router;