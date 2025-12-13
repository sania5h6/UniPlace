require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const moment = require('moment');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();

// === Config / PORT / App base URL ===
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// === Middleware ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === Multer (File Upload Config) ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// === MongoDB Models ===
const User = require('./models/User');
const Post = require('./models/Post');
const PlacementNotification = require('./models/PlacementNotification');

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// === Nodemailer transporter ===
const EMAIL_ENABLED = (process.env.EMAIL_ENABLED || 'true').toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '' // TRIM WHITESPACE
  }
});

// Verify transporter only if emailing is enabled
if (EMAIL_ENABLED) {
  transporter.verify()
    .then(() => {
      console.log('✅ SMTP server is ready to send emails.');
      console.log('📧 Email User:', process.env.EMAIL_USER);
    })
    .catch(err => {
      console.error('❌ SMTP verify failed:', err.message || err);
      console.error('Set EMAIL_ENABLED=false in .env to disable email sending while debugging.');
    });
} else {
  console.log('ℹ️ Email sending is disabled (EMAIL_ENABLED=false). Emails will be logged, not sent.');
}

// Helper: send email (respects EMAIL_ENABLED) - IMPROVED VERSION
async function sendNotificationEmail({ to, subject, text, html }) {
  if (!to) {
    console.log('⚠️ No recipient email provided');
    return;
  }
  
  if (!EMAIL_ENABLED) {
    console.log('ℹ️ [EMAIL DISABLED] Would send to:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    return;
  }
  
  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`Subject: ${subject}`);
    
    const info = await transporter.sendMail({
      from: `"UniPlace Notifications" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`);
    console.error('Error details:', err.message);
    console.error('Full error:', err);
  }
}

// Helper: extract mentions like @something
function extractMentions(text) {
  const mentions = [];
  if (!text) return mentions;
  const regex = /@([^\s@,;:.!?\)\(]+)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    mentions.push(m[1]);
  }
  return mentions;
}

// === Placement Questions ===
const placementQuestions = [
    "How did you start your placement preparation?",
    "What resources helped you the most?",
    "Any challenges you faced during interviews?",
    "How did you build your resume?",
    "One tip for juniors preparing for placements?"
];

// === Basic Routes ===
app.get('/', (req, res) => res.render('signup'));
app.get('/login', (req, res) => res.render('login'));
app.get('/reset', (req, res) => res.render('reset'));

// Test route
app.get('/test-notification', async (req, res) => {
    try {
        const testNotification = await PlacementNotification.create({
            email: 'test@gcet.edu.in',
            title: 'Test Title',
            company: 'Test Company',
            domain: 'Test Domain',
            description: 'Test Description',
            date: new Date(),
            createdAt: new Date()
        });
        res.json({ success: true, id: testNotification._id });
    } catch (err) {
        res.json({ success: false, error: err.message, details: err });
    }
});

// NEW: Email Test Route
app.get('/test-email', async (req, res) => {
    const testEmail = req.query.email || process.env.EMAIL_USER;
    
    console.log('\n=== EMAIL TEST STARTED ===');
    console.log('Testing email to:', testEmail);
    console.log('EMAIL_ENABLED:', EMAIL_ENABLED);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    
    try {
        await sendNotificationEmail({
            to: testEmail,
            subject: 'Test Email from UniPlace',
            text: 'This is a test email. If you receive this, your email setup is working!',
            html: '<p>This is a test email. If you receive this, your <strong>email setup is working!</strong></p>'
        });
        
        res.json({ 
            success: true, 
            message: `Test email sent to ${testEmail}. Check your inbox and spam folder!`,
            config: {
                enabled: EMAIL_ENABLED,
                user: process.env.EMAIL_USER,
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT
            }
        });
    } catch (err) {
        console.error('Test email error:', err);
        res.json({ 
            success: false, 
            error: err.message,
            config: {
                enabled: EMAIL_ENABLED,
                user: process.env.EMAIL_USER,
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT
            }
        });
    }
});

// === Authentication Routes ===

// Signup
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).send('Email and password required.');
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.send(`
        <script>
          alert("⚠ User already exists! Please try logging in.");
          window.location.href = "/login";
        </script>
      `);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({ email, password: hashedPassword, isAdmin: false });

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong during signup");
  }
});

// Login
// Login route with seamless migration from plaintext -> bcrypt-hashed passwords
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Email and password required.');

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).send('Invalid credentials.');

    // First try bcrypt (for users already migrated)
    if (user.password && user.password.startsWith('$2')) {
      // Looks like a bcrypt hash
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).send('Invalid credentials.');
    } else {
      // Not a bcrypt hash — legacy plaintext in DB
      if (user.password !== password) {
        return res.status(401).send('Invalid credentials.');
      }
      // Plaintext matched: migrate to bcrypt
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
      await user.save();
      console.log(`Migrated password to bcrypt for user ${email}`);
    }

    // At this point, authentication succeeded
    let redirectPath = `/dashboard?email=${encodeURIComponent(email)}`;
    if (user.isAdmin) redirectPath += `&isAdmin=true`;
    else if (!user.hasCompletedProfile) redirectPath = `/profile?email=${encodeURIComponent(email)}`;
    else if (!user.hasAnsweredQuestions) redirectPath = `/questions?email=${encodeURIComponent(email)}`;
    res.redirect(redirectPath);

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Login failed.');
  }
});

// === Profile Routes ===
app.get('/profile', (req, res) => {
    const { email } = req.query;
    if (!email) return res.redirect('/login');
    res.render('profile', { email });
});

app.post('/profile', upload.single('resume'), async (req, res) => {
    const { email } = req.body;
    // You may want to persist profile details here - currently redirects to questions
    res.redirect(`/questions?email=${encodeURIComponent(email)}`);
});

app.get('/updateProfile', async (req, res) => {
    const email = req.query.email;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("User not found");
    res.render('updateProfile', { email, user });
});

// === Questions Route ===
app.get('/questions', (req, res) => {
    const { email } = req.query;
    if (!email) return res.redirect('/login');
    res.render('questions', { email, questions: placementQuestions });
});

// === Dashboard Route ===
app.get('/dashboard', async (req, res) => {
    const { email, isAdmin } = req.query;
    if (!email) return res.redirect('/login');

    try {
        const user = await User.findOne({ email }).lean();
        if (!user) return res.status(404).send('User not found.');

        const stats = {
            total: await User.countDocuments(),
            completed: await User.countDocuments({ hasCompletedProfile: true }),
            answered: await User.countDocuments({ hasAnsweredQuestions: true }),
            uploaded: await User.countDocuments({ resume: { $exists: true, $ne: '' } })
        };

        const allPosts = await Post.find().sort({ createdAt: -1 }).lean();
        const groupedPosts = {};
        allPosts.forEach(post => {
            if (!groupedPosts[post.type]) groupedPosts[post.type] = [];
            post.timeAgo = moment(post.createdAt).fromNow();
            if (post.date) post.date = moment(post.date).format('MMMM Do, YYYY');
            if (post.comments) {
                post.comments.forEach(comment => {
                    comment.timeAgo = moment(comment.createdAt).fromNow();
                    if (comment.replies) {
                        comment.replies.forEach(reply => {
                            reply.timeAgo = moment(reply.createdAt).fromNow();
                        });
                    }
                });
            }
            groupedPosts[post.type].push(post);
        });

        const allNotifications = await PlacementNotification.find().sort({ createdAt: -1 }).lean();
        const latestNotification = allNotifications.length > 0 ? allNotifications[0] : null;

        if (latestNotification) {
            latestNotification.timeAgo = moment(latestNotification.createdAt).fromNow();
        }
        allNotifications.forEach(notification => {
            notification.timeAgo = moment(notification.createdAt).fromNow();
        });

        res.render('dashboard', { 
            email, 
            stats, 
            posts: groupedPosts, 
            moment, 
            latestNotification,
            allNotifications,
            isCurrentUserAdmin: user.isAdmin, 
            user 
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Failed to load dashboard.');
    }
});

// === Notifications Route ===
app.get('/notifications', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.redirect('/login');

    try {
        const allNotifications = await PlacementNotification.find().sort({ createdAt: -1 }).lean();
        allNotifications.forEach(notification => {
            notification.timeAgo = moment(notification.createdAt).fromNow();
            if (notification.date) {
                notification.date = moment(notification.date).format('MMMM Do, YYYY');
            }
        });

        res.render('notifications', { email, notifications: allNotifications });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).send('Failed to fetch notifications.');
    }
});

// === Post Routes ===
app.post('/post', async (req, res) => {
    const { type, title, content, email, company, domain, date } = req.body;
    if (!type || !title || !content || !email) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const post = new Post({
            type,
            title,
            content,
            postedBy: email,
            createdAt: new Date(),
            comments: []
        });

        if (company) post.company = company;
        if (domain) post.domain = domain;
        if (date) post.date = new Date(date);

        await post.save();
        res.redirect(`/dashboard?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error('Post save error:', err);
        res.status(500).send('Failed to save post');
    }
});

// View Posts by Type
app.get('/posts/:type', async (req, res) => {
    const { type } = req.params;
    const { email } = req.query;
    if (!email) return res.redirect('/login');
    
    try {
        const posts = await Post.find({ type }).sort({ createdAt: -1 }).lean();
        posts.forEach(post => {
            post.timeAgo = moment(post.createdAt).fromNow();
            if (post.date) post.date = moment(post.date).format('MMMM Do, YYYY');
            if (post.comments) {
                post.comments.forEach(comment => {
                    comment.timeAgo = moment(comment.createdAt).fromNow();
                    if (comment.replies) {
                        comment.replies.forEach(reply => {
                            reply.timeAgo = moment(reply.createdAt).fromNow();
                        });
                    }
                });
            }
        });
        res.render('postsByType', { type, posts, email, moment });
    } catch (err) {
        console.error(`Error fetching ${type} posts:`, err);
        res.status(500).send('Failed to fetch posts.');
    }
});

// --- Reply to Posts ---
// Notifies:
// - post owner (if different from replier)
// - any @mentions resolved to an email
app.post('/posts/:postId/reply', async (req, res) => {
    const { postId } = req.params;
    const { replyText, email: replierEmail } = req.body;
    if (!replyText || !replierEmail) return res.status(400).send('Reply and email required.');

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).send('Post not found.');

        const newComment = { 
            text: replyText, 
            postedBy: replierEmail, 
            createdAt: new Date(),
            replies: []
        };
        post.comments.push(newComment);
        await post.save();

        console.log('\n=== COMMENT NOTIFICATION ===');
        console.log('Post owner:', post.postedBy);
        console.log('Commenter:', replierEmail);

        // notify the post owner if they are different from replier
        if (post.postedBy && post.postedBy !== replierEmail) {
            console.log('Sending notification to post owner:', post.postedBy);
            const subject = `New comment on your post: "${post.title || post.type}"`;
            const text = `${replierEmail} commented on your post.\n\nComment: ${replyText}\n\nOpen: ${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(post.postedBy)}`;
            const html = `<p><strong>${replierEmail}</strong> commented on your post.</p>
                          <p>Comment: ${replyText}</p>
                          <p><a href="${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(post.postedBy)}">View post</a></p>`;
            await sendNotificationEmail({ to: post.postedBy, subject, text, html });
        } else {
            console.log('Skipping notification: User commented on their own post');
        }

        // handle @mentions in replyText
        const mentions = extractMentions(replyText);
        console.log('Mentions found:', mentions);
        
        for (const mention of mentions) {
            let targetEmail = null;

            // if mention looks like an email
            if (mention.includes('@') && mention.includes('.')) {
                targetEmail = mention;
            } else {
                // try to find a user with local-part starting with mention
                const regex = new RegExp('^' + mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '@', 'i');
                const user = await User.findOne({ email: regex });
                if (user) targetEmail = user.email;
            }

            if (targetEmail && targetEmail !== replierEmail) {
                console.log('Sending mention notification to:', targetEmail);
                const subject = `${replierEmail} mentioned you in a comment`;
                const text = `${replierEmail} mentioned you in a comment on a post titled "${post.title || post.type}".\n\nComment: ${replyText}\n\nOpen: ${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(targetEmail)}`;
                const html = `<p><strong>${replierEmail}</strong> mentioned you in a comment on the post "<em>${post.title || post.type}</em>".</p>
                              <p>Comment: ${replyText}</p>
                              <p><a href="${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(targetEmail)}">View post</a></p>`;
                await sendNotificationEmail({ to: targetEmail, subject, text, html });
            }
        }

        res.redirect(`/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(replierEmail)}`);
    } catch (err) {
        console.error('Reply error:', err);
        res.status(500).send('Reply failed.');
    }
});

// --- Reply to Comments (nested reply) ---
// Notifies:
// - original comment author (if different from replier)
// - any @mentions resolved to email
app.post('/posts/:postId/comments/:commentId/reply', async (req, res) => {
    const { postId, commentId } = req.params;
    const { replyText, email: replierEmail } = req.body;
    if (!replyText || !replierEmail) return res.status(400).send('Reply and email required.');

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).send('Post not found.');

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).send('Comment not found.');

        if (!comment.replies) comment.replies = [];
        const newReply = { 
            text: replyText, 
            postedBy: replierEmail, 
            createdAt: new Date() 
        };
        comment.replies.push(newReply);
        await post.save();

        console.log('\n=== REPLY NOTIFICATION ===');
        console.log('Comment author:', comment.postedBy);
        console.log('Replier:', replierEmail);

        // notify original comment author
        if (comment.postedBy && comment.postedBy !== replierEmail) {
            console.log('Sending notification to comment author:', comment.postedBy);
            const subject = `${replierEmail} replied to your comment`;
            const text = `${replierEmail} replied to your comment on the post "${post.title || post.type}".\n\nReply: ${replyText}\n\nOpen: ${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(comment.postedBy)}`;
            const html = `<p><strong>${replierEmail}</strong> replied to your comment on the post "<em>${post.title || post.type}</em>".</p>
                          <p>Reply: ${replyText}</p>
                          <p><a href="${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(comment.postedBy)}">View post</a></p>`;
            await sendNotificationEmail({ to: comment.postedBy, subject, text, html });
        } else {
            console.log('Skipping notification: User replied to their own comment');
        }

        // handle mentions in replyText
        const mentions = extractMentions(replyText);
        console.log('Mentions found:', mentions);
        
        for (const mention of mentions) {
            let targetEmail = null;

            if (mention.includes('@') && mention.includes('.')) {
                targetEmail = mention;
            } else {
                const regex = new RegExp('^' + mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '@', 'i');
                const user = await User.findOne({ email: regex });
                if (user) targetEmail = user.email;
            }

            if (targetEmail && targetEmail !== replierEmail) {
                console.log('Sending mention notification to:', targetEmail);
                const subject = `${replierEmail} mentioned you in a reply`;
                const text = `${replierEmail} mentioned you in a reply on the post "${post.title || post.type}".\n\nReply: ${replyText}\n\nOpen: ${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(targetEmail)}`;
                const html = `<p><strong>${replierEmail}</strong> mentioned you in a reply on the post "<em>${post.title || post.type}</em>".</p>
                              <p>Reply: ${replyText}</p>
                              <p><a href="${APP_BASE_URL}/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(targetEmail)}">View post</a></p>`;
                await sendNotificationEmail({ to: targetEmail, subject, text, html });
            }
        }

        res.redirect(`/posts/${encodeURIComponent(post.type)}?email=${encodeURIComponent(replierEmail)}`);
    } catch (err) {
        console.error('Nested reply error:', err);
        res.status(500).send('Failed to reply.');
    }
});

// === Update Profile POST (updateProfile route) ===
app.post('/updateProfile', upload.single('resume'), async (req, res) => {
    const {
        email,
        firstName,
        lastName,
        phone,
        branch,
        year,
        skills,
        bio
    } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).send("User not found");

        user.profile = {
            ...user.profile,
            firstName,
            lastName,
            phone,
            branch,
            year,
            bio,
            skills: skills ? skills.split(',').map(s => s.trim()) : []
        };

        if (req.file) {
            user.profile.resumePath = req.file.filename;
        }

        await user.save();
        res.redirect(`/dashboard?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).send("Failed to update profile.");
    }
});

// === Admin Routes ===
app.get('/admin/notifications/create', (req, res) => {
    const { email } = req.query;
    res.render('adminPanel', { 
        email, 
        error: null, 
        message: null 
    });
});

app.post('/admin/notifications/create', async (req, res) => {
    const { email, title, company, domain, description, date } = req.body;
    
    if (!email || !title || !company || !domain || !description || !date ||
        email.trim() === '' || title.trim() === '' || company.trim() === '' || 
        domain.trim() === '' || description.trim() === '' || date.trim() === '') {
        
        return res.render('adminPanel', {
            email: email || '',
            error: 'All fields are required and cannot be empty.',
            message: null
        });
    }

    try {
        await PlacementNotification.create({
            email: email.trim(),
            title: title.trim(),
            company: company.trim(),
            domain: domain.trim(),
            description: description.trim(),
            date: new Date(date),
            createdAt: new Date()
        });
        
        res.render('adminPanel', {
            email,
            message: '✅ Notification posted successfully!',
            error: null
        });
    } catch (err) {
        console.error('Notification creation error:', err);
        res.render('adminPanel', {
            email: email || '',
            error: '❌ Failed to save notification. Please try again.',
            message: null
        });
    }
});

// === Account Settings ===
app.post('/update-account-settings', async (req, res) => {
    const { email, currentPassword, newPassword, confirmPassword, emailNotifications, placementAlerts } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).send('User not found.');
        
        const updateData = {
            emailNotifications: emailNotifications === 'on',
            placementAlerts: placementAlerts === 'on'
        };
        
        if (newPassword && newPassword.trim() !== '') {
            if (!currentPassword) {
                return res.status(400).send('Current password required to change password.');
            }
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) {
                return res.status(400).send('Incorrect current password.');
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).send('Passwords do not match.');
            }
            if (newPassword.length < 6) {
                return res.status(400).send('Password too short.');
            }
            const hashed = await bcrypt.hash(newPassword, 10);
            updateData.password = hashed;
        }
        
        await User.findOneAndUpdate({ email }, { $set: updateData });
        res.redirect(`/dashboard?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error('Account update error:', err);
        res.status(500).send('Failed to update settings.');
    }
});

// === Admin Delete Posts Page ===
app.get('/admin/delete-posts', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.redirect('/login');

    const user = await User.findOne({ email });
    if (!user || !user.isAdmin) {
        return res.status(403).send("Access denied");
    }

    try {
        const posts = await Post.find().sort({ createdAt: -1 }).lean();
        posts.forEach(post => {
            post.timeAgo = moment(post.createdAt).fromNow();
        });

        res.render('deletePosts', { email, posts });
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).send("Failed to load delete posts page.");
    }
});

// Handle Bulk Delete
app.post('/admin/delete-posts/bulk', async (req, res) => {
    const { email, period } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isAdmin) {
        return res.status(403).send("Access denied");
    }

    try {
        const monthsAgo = moment().subtract(period, 'months').toDate();
        await Post.deleteMany({ createdAt: { $lt: monthsAgo } });
        res.redirect(`/dashboard?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error("Bulk delete error:", err);
        res.status(500).send("Failed to delete posts.");
    }
});

// Handle Single Post Delete
app.post('/admin/delete-posts/single', async (req, res) => {
    const { email, postId } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isAdmin) {
        return res.status(403).send("Access denied");
    }

    try {
        await Post.findByIdAndDelete(postId);
        res.redirect(`/dashboard?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error("Single delete error:", err);
        res.status(500).send("Failed to delete post.");
    }
});

// Logout Route
app.get('/logout', (req, res) => res.redirect('/login'));

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});

// 404 Handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at ${APP_BASE_URL}`);
    console.log('Available routes:');
    console.log('- GET  / (signup)');
    console.log('- GET  /login');
    console.log('- GET  /dashboard');
    console.log('- GET  /notifications (all placement notifications)');
    console.log('- GET  /admin/notifications/create (admin only)');
    console.log('- POST /admin/notifications/create (admin only)');
    console.log('- GET  /test-email?email=your@email.com (test email functionality)');
});