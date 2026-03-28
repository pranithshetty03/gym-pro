# 💪 GymPro — Trainer Dashboard

A full-stack gym management app for personal trainers. Built with **Next.js 14**, **Supabase**, **Firebase Auth**, and **ShadCN UI**.

---

## ✨ Features

- 🔐 **Firebase Google Auth** — Secure trainer login
- 👥 **Member Management** — Add, view, edit, delete members
- 📅 **Membership Tracking** — Auto status (active / expiring soon / expired)
- 🔔 **Reminders** — SMS + Email alerts for expiring memberships
- 💾 **Supabase Backend** — Real-time PostgreSQL with Row Level Security
- 🚀 **Vercel Deployment** — One-click public deployment

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI Components | ShadCN UI + Tailwind CSS |
| Authentication | Firebase Auth (Google) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <your-repo>
cd gym-trainer-dashboard
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Google Sign-In** under Authentication → Sign-in method
4. Add your domain to **Authorized domains** (localhost + your Vercel URL)
5. Copy your app config

### 3. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a project
2. Open **SQL Editor** and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key

### 4. Environment Variables

Create `.env.local` in the project root:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### 5. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 📦 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Add env variables in Vercel Dashboard:**
Settings → Environment Variables → add all vars from `.env.local`

**Add your Vercel domain to Firebase:**
Firebase Console → Authentication → Settings → Authorized domains → Add domain

---

## 📁 Project Structure

```
gym-trainer-dashboard/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Redirect to /dashboard
│   ├── login/page.tsx      # Firebase login page
│   ├── dashboard/page.tsx  # Stats + overview
│   ├── members/
│   │   ├── page.tsx        # Members list
│   │   ├── new/page.tsx    # Add member form
│   │   └── [id]/page.tsx   # Member detail
│   ├── reminders/page.tsx  # Expiry alerts via SMS/Email
│   └── messages/page.tsx   # Redirects to reminders
├── components/
│   └── layout/
│       ├── AuthProvider.tsx
│       ├── Sidebar.tsx
│       └── DashboardLayout.tsx
├── lib/
│   ├── firebase.ts
│   ├── supabase.ts
│   └── utils.ts
├── types/
│   └── supabase.ts
├── supabase-schema.sql     # Run this in Supabase SQL Editor
└── .env.example            # Copy to .env.local
```

---

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/login` | Google sign-in |
| `/dashboard` | Overview stats, expiring members |
| `/members` | Full member list with filters |
| `/members/new` | Add new member |
| `/members/[id]` | Member detail + renew |
| `/reminders` | Expiry alerts via SMS/Email |
| `/messages` | Redirects to `/reminders` |

---

# gym-pro
