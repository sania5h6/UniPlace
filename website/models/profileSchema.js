const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Email must be unique and required
  name: { type: String, required: true },
  branch: { type: String, required: true },
  skills: { type: String, required: true },
  cgpa: { type: String, required: true }, // You can use Number or mongoose.Decimal128 if preferred
  resumePath: { type: String, required: true } // Path to uploaded resume, required
});

module.exports = mongoose.model("Profile", profileSchema);
