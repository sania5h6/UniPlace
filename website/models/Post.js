// ======= models/Post.js =======
const mongoose = require('mongoose');

// Define a schema for nested replies (replies to comments)
const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true },
  postedBy: { type: String, required: true }, // The email of the user who replied
  createdAt: { type: Date, default: Date.now }
});

// Define a schema for individual comments
const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  postedBy: { type: String, required: true }, // The email of the user who commented
  createdAt: { type: Date, default: Date.now },
  replies: [ReplySchema] // Array to store replies to this comment
});

// Define the main Post schema
const PostSchema = new mongoose.Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String },
  date: { type: Date },
  content: { type: String, required: true },
  domain: { type: String },
  postedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  comments: [CommentSchema] // Array to store all comments for this post
});

module.exports = mongoose.model('Post', PostSchema);