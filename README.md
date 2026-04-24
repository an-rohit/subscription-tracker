
```markdown
# 💳 SubTracker — AI-Powered Subscription Manager

A full-stack web application that helps users track, manage, and optimize recurring subscriptions using AI-driven insights, analytics, and smart renewal tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.0-61dafb?logo=react)
![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169e1?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-6.7.0-2D3748?logo=prisma)

---

## 🌟 Features

### 🔐 Authentication & Security
- Secure JWT-based authentication system
- bcrypt password hashing (industry-standard encryption)
- Protected API routes with user-level data isolation
- CORS configured for safe cross-origin communication

### 💳 Subscription Management
- Full CRUD operations for subscriptions
- Quick-add popular services (Netflix, Spotify, Amazon Prime, etc.)
- Natural language input parsing (e.g., "Netflix 499 monthly")
- Category-based organization (OTT, Music, SaaS, Gaming, etc.)
- Renewal date tracking with smart validation

### 📊 Analytics Dashboard
- Monthly and yearly spending insights
- Category-wise breakdown of expenses
- Interactive charts using Recharts
- Upcoming renewal alerts (7-day forecast)
- Recent activity tracking

### 🤖 AI-Powered Features
- AI-based spending analysis and suggestions
- Natural language subscription parser
- Finance assistant chatbot for queries
- Multi-model fallback system for reliability
- Regex fallback for offline-safe parsing

### ✨ User Experience
- Smooth UI animations using Framer Motion
- Responsive design (mobile + desktop)
- Toast notifications for user feedback
- Loading states and error handling
- Clean and minimal interface

---

## 🏗️ Architecture

```

Frontend (React + Vite)
↓
REST API (Express.js)
↓
Authentication Middleware (JWT)
↓
Prisma ORM
↓
PostgreSQL Database

```

---

## 🛠️ Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React 18, Vite, React Router |
| Styling | Tailwind CSS, Framer Motion |
| Charts | Recharts |
| Backend | Node.js, Express.js |
| Auth | JWT, bcrypt |
| Database | PostgreSQL |
| ORM | Prisma |
| AI | OpenRouter API (LLMs + fallback system) |

---

## 🗄️ Database Design

Normalized schema with 4 main tables:

- **users** → authentication & profile
- **categories** → subscription classification
- **subscriptions** → core tracking entity
- **payment_history** → historical tracking

Relationships:
```

User → Subscriptions → Payment History
Category → Subscriptions

```

---

## 📁 Project Structure

```

subscription-tracker/
├── backend/
│   ├── prisma/
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       └── app.js
│
└── frontend/
└── src/
├── components/
├── pages/
├── context/
├── services/
└── App.jsx

````

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database

---

### 1. Clone Repository
```bash
git clone https://github.com/your-username/subscription-tracker.git
cd subscription-tracker
````

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
DATABASE_URL="your_postgres_url"
DIRECT_URL="your_direct_db_url"
JWT_SECRET="your_secret_key"
OPENROUTER_API_KEY="your_api_key"
PORT=5000
```

Run database:

```bash
npx prisma db push
```

Start server:

```bash
node src/app.js
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Overview

### Auth

* POST `/api/auth/register`
* POST `/api/auth/login`

### Subscriptions

* GET `/api/subscriptions`
* POST `/api/subscriptions`
* PUT `/api/subscriptions/:id`
* DELETE `/api/subscriptions/:id`

### Analytics

* GET `/api/analytics/summary`
* GET `/api/analytics/by-category`
* GET `/api/analytics/upcoming-renewals`

### AI

* POST `/api/ai/analyze`
* POST `/api/ai/parse-subscription`
* POST `/api/ai/chat`

---

## 🔒 Security Highlights

* JWT authentication with expiration handling
* bcrypt password hashing
* User-level data isolation (no cross-user access)
* Input validation on all endpoints
* Secure API structure with middleware protection

---

## 🧪 Testing Summary

* Authentication flow tested (register/login/token validation)
* CRUD operations validated
* Analytics calculations verified
* AI fallback system tested
* Error handling implemented (401/404/500 cases)

---

## 📸 Screenshots
<img width="1074" height="723" alt="image" src="https://github.com/user-attachments/assets/66262413-3e29-4f24-b367-f2014e7c2a7e" />
<img width="752" height="635" alt="image" src="https://github.com/user-attachments/assets/ee23a13a-958b-4898-876c-e278eb6a2201" />
<img width="1716" height="708" alt="image" src="https://github.com/user-attachments/assets/9d7b8f1b-a01b-4029-afa1-984360367b62" />
<img width="1717" height="711" alt="image" src="https://github.com/user-attachments/assets/bd38dbaa-d4f4-4d05-91e4-0022216cfa02" />
<img width="1674" height="697" alt="image" src="https://github.com/user-attachments/assets/60dc970b-6ff0-43b9-8028-9836895b33e6" />


---

## 👨‍💻 Author

**Rohit**
Computer Science Undergraduate
GitHub: [@your-username](https://github.com/an-rohit)

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

```
