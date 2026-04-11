const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  getProfile,
  completeProfile,
} = require("../controllers/userController");

router.get("/profile", auth, getProfile);
router.post("/complete-profile", auth, completeProfile);

module.exports = router;