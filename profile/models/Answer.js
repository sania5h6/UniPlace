const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  email: String,
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Answer', answerSchema);
