const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  agentName: String,
  hospitalName: String,
  hospitalContact: String,
  mediclaimType: String,
  treatmentType: String,
  admissionDate: String,
  dischargeDate: String,
  totalExpense: Number,
  uploadedFile: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Claim", claimSchema);