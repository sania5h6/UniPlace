// migrate-passwords.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({});
  for (const u of users) {
    if (u.password && !u.password.startsWith('$2')) {
      const hashed = await bcrypt.hash(u.password, 10);
      u.password = hashed;
      await u.save();
      console.log(`Hashed password for ${u.email}`);
    }
  }
  console.log('Migration complete.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
