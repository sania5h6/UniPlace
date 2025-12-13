# UniPlace – Placement & Networking Portal

UniPlace is a centralized web-based platform designed to streamline college placement activities by connecting students, alumni, and Training & Placement Officers (TPOs) in one unified system. The platform focuses on placement awareness, peer mentorship, and real-time opportunity sharing to improve students’ career readiness.

---

## 🚀 Features

* **Secure Authentication**
  Email-based login restricted to institutional domains (e.g., `@gcet.edu.in`) with encrypted passwords and OTP-based password reset.

* **Student Profile Management**
  One-time profile creation with academic, technical, and placement-related details.

* **Placement Readiness & Q&A**
  Placement-related questions asked once per student, with answers displayed publicly in a common feed.

* **Opportunities Feed**
  Real-time feed for:

  * Internship postings
  * Job vacancies (alumni-driven)
  * Interview tips
  * Success stories
  * Mentorship questions

* **Dashboard for All Users**
  Personalized dashboard after login with quick access to posts, profile editing, and community content.

* **Admin / TPO Panel**
  Dedicated interface for posting official placement notifications and updates.

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript, EJS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Authentication:** bcrypt, express-session
* **Email Services:** Nodemailer (OTP-based verification)

---

## 📐 System Architecture (Overview)

1. User accesses UniPlace via browser
2. Frontend (EJS + CSS) communicates with Express server
3. Server handles authentication, sessions, and business logic
4. MongoDB stores user profiles, posts, and placement data
5. Notifications and OTPs are sent via email services

---

## ⚙️ Installation & Setup

1. Clone the repository

   ```bash
   git clone https://github.com/your-username/uniplace.git
   ```

2. Navigate to the project directory

   ```bash
   cd uniplace
   ```

3. Install dependencies

   ```bash
   npm install
   ```

4. Configure environment variables (MongoDB URI, Email credentials)

5. Start the server

   ```bash
   node server.js
   ```

6. Open in browser

   ```
   http://localhost:3000
   ```

---

## 🎯 Objectives

* Centralize all placement-related activities
* Improve student placement awareness
* Encourage peer learning and mentorship
* Provide TPOs with better visibility and control

---

## 🔮 Future Enhancements

* Resume builder with templates
* Placement readiness scoring
* Analytics dashboard for TPOs
* Mobile application support

---

## 👩‍💻 Authors
**manoj(R.Manoj)**
**Indu (Ranga Indu)**
**Sania (Shaik Sania)**
Computer Science Students
Project: UniPlace – Placement & Networking Portal

---

## 📄 License

This project is developed for academic and learning purposes.
