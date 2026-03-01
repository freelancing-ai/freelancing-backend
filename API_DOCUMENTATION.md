# Nexurah API Documentation

Welcome to the Nexurah API documentation. This document outlines the available endpoints, required payloads, and expected responses for the Nexurah backend.

**Base URL**: `http://localhost:5000/api`

---

## 🔐 Authentication

### 1. Register User
`POST /auth/register`
Creates a new user account (Freelancer or Company).

**Payload:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "freelancer" // or "company"
}
```

**Response (201 Created):**
```json
{
  "_id": "65df...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "freelancer",
  "token": "eyJhbGci..."
}
```

### 2. Login User
`POST /auth/login`
Authenticates a user and returns a JWT token.

**Payload:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "_id": "65df...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "freelancer",
  "token": "eyJhbGci..."
}
```

---

## 👤 User Profile

### 1. Get Current Profile
`GET /profile/me`
Retrieves the profile of the currently authenticated user.
*Requires Authorization Header: `Bearer <token>`*

**Response (200 OK):**
```json
{
  "_id": "65df...",
  "userId": {
    "_id": "65df...",
    "name": "John Doe",
    "email": "john@example.com",
    "trustScore": 75,
    "globalRating": 4.5
  },
  "skills": ["React", "Node.js"],
  "bio": "Expert web developer with 5 years of experience.",
  "hourlyRate": 50,
  "country": "USA",
  "fraudScore": 0,
  "verified": true,
  "testScore": 8,
  "testTaken": true
}
```

---

## 💼 Jobs

### 1. Create a Job
`POST /jobs`
Allows a company to post a new job opening.
*Requires Authorization Header: `Bearer <token>` (Company Role)*

**Payload:**
```json
{
  "title": "React Frontend Developer Needed",
  "description": "We need a skilled React developer to build a modern dashboard for our analytics platform.",
  "budget": 2000,
  "deadline": "2024-05-01",
  "requiredSkills": ["React", "Tailwind CSS", "Redux"]
}
```

**Response (201 Created):**
```json
{
  "_id": "65e2...",
  "companyId": "65df...",
  "title": "React Frontend Developer Needed",
  "budget": 2000,
  "status": "open",
  "requiredSkills": ["React", "Tailwind CSS", "Redux"]
}
```

### 2. Get All Jobs
`GET /jobs`
Retrieves all open jobs.

**Response (200 OK):**
```json
[
  {
    "_id": "65e2...",
    "title": "React Frontend Developer Needed",
    "companyId": { "name": "Tech Corp" },
    "budget": 2000,
    "status": "open"
  }
]
```

---

## 📈 Bids

### 1. Place a Bid
`POST /bids`
Allows a freelancer to bid on an open job.
*Requires Authorization Header: `Bearer <token>` (Freelancer Role)*

**Payload:**
```json
{
  "jobId": "65e2...",
  "amount": 1800,
  "proposal": "I have extensive experience with React and can deliver high-quality code on time.",
  "deliveryInDays": 14
}
```

---

## 🧠 Smart Matching & AI

### 1. Get Matching Freelancers
`GET /matching/:jobId`
Ranks freelancers for a specific job based on skills, Trust Index, and Rating.
*Requires Authorization Header: `Bearer <token>`*

**Response (200 OK):**
```json
[
  {
    "name": "John Doe",
    "finalScore": 92,
    "contentScore": 100,
    "collabScore": 85,
    "trustScore": 75
  }
]
```

### 2. Generate AI Assessment
`POST /test/generate`
Generates 10 AI-powered MCQ questions for a specific role.
*Requires Authorization Header: `Bearer <token>`*

**Payload:**
```json
{
  "role": "Web Developer"
}
```

**Response (200 OK):**
```json
[
  {
    "question": "What is the purpose of React hooks?",
    "options": ["Manage state", "Style components", "Database query", "Server config"],
    "correctAnswer": 0
  }
]
```

### 3. Submit Assessment Score
`POST /test/submit`
Saves the freelancer's test score to their profile.
*Requires Authorization Header: `Bearer <token>`*

**Payload:**
```json
{
  "score": 8,
  "category": "Web Developer"
}
```

---

## 🏗️ Projects

### 1. Complete Project
`PUT /projects/:id/complete`
Marks a project as completed and updates the freelancer's Trust Score and Rating.
*Requires Authorization Header: `Bearer <token>`*

**Payload:**
```json
{
  "clientRating": 5,
  "deliveryTime": "on-time" // or "delayed"
}
```
