const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");

// ✅ DONATION SCHEMA (only for payment flow)
const DonationSchema = new mongoose.Schema({
  amount: Number,
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  status: {
    type: String,
    default: "Success"
  },
  donatedAt: {
    type: Date,
    default: Date.now
  }
});

const Donation = mongoose.models.Donation || mongoose.model("Donation", DonationSchema);

// ✅ INIT RAZORPAY
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ CREATE ORDER
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    console.log("Incoming amount:", amount);

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("RAZORPAY ERROR FULL:", error);

    res.status(500).json({
      success: false,
      message: error.error?.description || "Order creation failed",
    });
  }
});

// ✅ VERIFY + SAVE DONATION
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // ✅ SAVE DONATION ONLY AFTER SUCCESS
      const donation = new Donation({
        amount: amount || 0,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      await donation.save();

      return res.json({
        success: true,
        donation
      });
    }

    res.status(400).json({ success: false });

  } catch (error) {
    console.error("VERIFY ERROR:", error);
    res.status(500).json({ success: false });
  }
});

// ✅ DONATION HISTORY
router.get("/donations", async (req, res) => {
  try {
    const donations = await Donation.find().sort({ donatedAt: -1 });

    res.json({
      success: true,
      donations
    });

  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;