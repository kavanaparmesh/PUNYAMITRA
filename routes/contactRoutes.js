const express = require("express");

const router = express.Router();

const mongoose = require("mongoose");


// CONTACT SCHEMA
const ContactSchema = new mongoose.Schema({

  name: String,

  email: String,

  subject: String,

  message: String,

  createdAt: {
    type: Date,
    default: Date.now
  }

});


// MODEL
const Contact =
  mongoose.models.Contact ||
  mongoose.model(
    "Contact",
    ContactSchema
  );


// SAVE CONTACT MESSAGE
router.post("/", async (req, res) => {

  try {

    const {
      name,
      email,
      subject,
      message
    } = req.body;

    const newMessage = new Contact({

      name,
      email,
      subject,
      message

    });

    await newMessage.save();

    res.json({

      success: true,

      message:
        "Message sent successfully"

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        "Server Error"

    });
  }
});


// GET ALL CONTACT MESSAGES
router.get("/", async (req, res) => {

  try {

    const messages =
      await Contact.find()
      .sort({ createdAt: -1 });

    res.json({

      success: true,

      messages

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false

    });
  }
});


module.exports = router;