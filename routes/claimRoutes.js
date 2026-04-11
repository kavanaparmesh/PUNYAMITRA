const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  applyClaim,
  getClaims,
} = require("../controllers/claimController");

router.post("/apply-claim", auth, applyClaim);
router.get("/claims", auth, getClaims);

module.exports = router;