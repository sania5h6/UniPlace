const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  isAdmin: { type: Boolean, default: false },
  hasCompletedProfile: { type: Boolean, default: false },
  hasAnsweredQuestions: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  placementAlerts: { type: Boolean, default: true },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    branch: String,
    year: Number,
    skills: [String],
    bio: String,
    resumePath: String
  }
});

module.exports = mongoose.model('User', userSchema);
