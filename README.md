<p align="center">
  <img src="public/uiu-logo.svg" alt="UIU Student Hub Logo" width="80" />
</p>

<h1 align="center">UIU Student Hub</h1>

<p align="center">
  A comprehensive, all-in-one web platform built for <strong>United International University (UIU)</strong> students — featuring academic tools, faculty reviews, schedule planning, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-3.4-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [CGPA Calculator](#-cgpa-calculator)
  - [Section Selector](#-section-selector)
  - [Fee Calculator](#-fee-calculator)
  - [Faculty Reviews](#-faculty-reviews)
  - [User Profile & Dashboard](#-user-profile--dashboard)
  - [Admin Panel](#-admin-panel)
  - [Authentication System](#-authentication-system)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Models](#database-models)
- [API Routes](#api-routes)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
  - [First Admin Setup](#first-admin-setup)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

**UIU Student Hub** is a feature-rich web application designed specifically for UIU students. It provides a suite of academic tools that work **without requiring an account**, while offering persistent data storage and additional features for registered users. The platform includes:

- A **CGPA Calculator** with UIU's official grading scale and retake support
- A **Section Selector** that parses UIU's official class routine PDFs for smart schedule planning
- A **Fee Calculator** covering all 17 UIU programs with waiver and installment breakdowns
- A **Faculty Review** system with anonymous ratings and detailed breakdowns
- A full **Admin Panel** for platform management
- **Email-verified authentication** restricted to UIU student email domains

---

## Features

### 📊 CGPA Calculator

A full-featured CGPA calculator built around UIU's official grading policy (11 grade levels, A through F).

- **Multiple trimester support** — add unlimited trimesters, each with unlimited courses
- **Previous academic data** — input existing credits and CGPA to carry forward
- **Retake course handling** — toggle retake flag per course; old grade points are subtracted and replaced with new ones (UIU retake policy)
- **Real-time calculation** — instant GPA and cumulative CGPA as you add/modify courses
- **Interactive CGPA trend chart** — Recharts `LineChart` visualizing GPA and CGPA progression across trimesters
- **Results summary** — per-trimester breakdown with GPA, CGPA, trimester credits, total credits, and earned credits
- **Save records** — authenticated users can persist calculations to their profile
- **UIU grading reference** — collapsible table showing all grade levels with point values, mark ranges, and assessments

| Grade | Points | Marks     | Assessment     |
| ----- | ------ | --------- | -------------- |
| A     | 4.00   | 90 – 100  | Outstanding    |
| A-    | 3.67   | 86 – 89   | Excellent      |
| B+    | 3.33   | 82 – 85   | Very Good      |
| B     | 3.00   | 78 – 81   | Good           |
| B-    | 2.67   | 74 – 77   | Above Average  |
| C+    | 2.33   | 70 – 73   | Average        |
| C     | 2.00   | 66 – 69   | Below Average  |
| C-    | 1.67   | 62 – 65   | Poor           |
| D+    | 1.33   | 58 – 61   | Very Poor      |
| D     | 1.00   | 55 – 57   | Pass           |
| F     | 0.00   | 0 – 54    | Fail           |

---

### 📅 Section Selector

A smart class schedule planner that directly parses UIU's official class routine PDF documents.

- **PDF import** — drag-and-drop or file picker for UIU class routine PDFs; supports both Format 252 (with serial numbers) and Format 253 (without)
- **Demo data** — pre-loaded demo PDF for instant exploration without downloading a routine
- **Multiple view modes** — Card view, Table view, and visual Planner/timetable view
- **Multi-plan support** — create multiple schedule plans and move/swap courses between them
- **Conflict detection** — automatic time-slot collision warnings when adding courses
- **Smart search** — fuzzy/acronym-based search (e.g., "OOP" matches "Object Oriented Programming")
- **Department & course filtering** — filter by program or search across all courses
- **Faculty preference matching** — see faculty names per section for informed choices
- **Export capabilities:**
  - **PDF** — styled schedule table rendered via html2canvas + jsPDF
  - **PNG** — high-resolution image export
  - **Excel** — XLSX export with multi-sheet support (one sheet per plan) via SheetJS
  - **Calendar (.ics)** — generates recurring weekly calendar events (15 weeks) compatible with Google Calendar, Apple Calendar, Outlook, etc.

---

### 💰 Fee Calculator

Comprehensive fee estimation covering all UIU programs with three calculation modes.

- **Trimester/Semester Fee Calculator**
  - Select from all 17 UIU programs (13 undergraduate, 4 graduate)
  - Enter credit count, apply waiver percentage
  - Supports both trimester and semester fee structures
  - Lab fee handling for applicable programs
  - Fresher semester toggle (includes admission + caution fees)
  - Detailed installment breakdown (trimester: 20k upfront + 40/30/30 split; semester: 20k upfront + 4×25%)
- **Total Program Cost Estimator**
  - Full degree cost from start to finish
  - Supports credit variant programs (e.g., MBA 30-credit vs 60-credit)
  - Term-by-term fee projection with waiver applied
- **Retake Fee Calculator**
  - Per-credit retake fee with automatic 50% first-retake waiver (UIU policy)
- **Waiver presets** — quick selection for common waiver tiers (0%, 25%, 50%, 100%, and custom)
- **UIU fee policy reference** — expandable section with official source links
- **Bangladeshi currency formatting** — amounts displayed with ৳ symbol and proper number grouping

---

### ⭐ Faculty Reviews

An anonymous faculty rating and review system for sharing academic experiences.

- **Faculty directory** — searchable, filterable, sortable listing of all approved UIU faculty
  - Filter by department
  - Sort by name, average rating, or review count (ascending/descending)
  - Faculty cards show rating circle, department, designation, and review count
- **Faculty profiles** — detailed page per faculty member with:
  - Contact info and social links (email, phone, office, website, GitHub, LinkedIn, Google Scholar)
  - Bio section
  - Animated rating breakdown bars for 4 categories: Teaching, Grading, Friendliness, Availability
  - Quick stats: overall rating, total reviews, "would take again" percentage, average difficulty
- **Review system**
  - Star ratings for 4 categories (1–5 scale each)
  - Course taken and trimester fields
  - Difficulty rating (Easy / Medium / Hard)
  - "Would take again" toggle
  - Comment (10–1000 characters)
  - **Anonymous usernames** — choose any display name; username uniqueness enforced across all reviews
  - **Username autocomplete** — reuse usernames from your previous reviews
  - **One review per faculty per user** — edit or delete your existing review anytime
- **Like/dislike reactions** — toggle-based reaction system on reviews; switching reactions auto-removes the previous one
- **Review sorting** — by most recent, most helpful (by like count), highest rating, or lowest rating
- **Faculty addition requests** — logged-in users can submit new faculty members for admin review
  - Real-time initials uniqueness check with debounced API validation
  - Admin receives email notification for new requests

---

### 👤 User Profile & Dashboard

A personalized dashboard for registered users with four sections:

- **Personal Info** — avatar, name (editable), email with verification status, student ID (editable, numeric only), department (derived from email domain), role, member since date
- **Academic** — overview of saved CGPA data:
  - Stat cards: current CGPA, credits earned, trimesters completed, last trimester GPA
  - Trimester-wise performance with animated color-coded GPA bars and cumulative CGPA tracking
  - Direct link to CGPA Calculator
- **My Faculties** — faculty members submitted by the user, grouped by status (Approved / Pending / Declined)
  - Shows admin modifications for approved requests with edits
  - Links to approved faculty detail pages
- **My Reviews** — all reviews written by the user with faculty info, course, trimester, rating, and difficulty

---

### 🛡️ Admin Panel

A full administrative dashboard for platform management.

- **Dashboard** — overview stats: total users, faculty members, total reviews, pending requests; recent users list; pending faculty requests preview
- **User Management**
  - Searchable, paginated user list
  - Promote/demote users to admin role
  - Delete users (with confirmation; self-deletion blocked)
  - Verified/admin badges on user cards
- **Faculty Management**
  - Full CRUD operations for faculty members
  - Create faculty directly (auto-approved)
  - Edit all faculty fields including contact info, social links, bio
  - Toggle approval status
  - Real-time initials uniqueness validation
- **Faculty Requests**
  - Review user-submitted faculty requests
  - Filter by status (Pending / Approved / Declined)
  - **Approve with edits** — admin can modify fields before approval; changes tracked as diffs
  - Decline with admin note
  - Bulk clear processed requests by status
- **Review Moderation**
  - Paginated review list with faculty info
  - View full review details
  - Delete inappropriate reviews (triggers faculty rating recalculation)
- **Domain Management**
  - Manage allowed email domains for user registration
  - Add/remove domains with format validation
  - Reset to default UIU domains
  - Minimum 1 domain enforced

**Default allowed email domains:**

```
bscse.uiu.ac.bd, bsds.uiu.ac.bd, bseee.uiu.ac.bd, bsce.uiu.ac.bd,
bba.uiu.ac.bd, bbaais.uiu.ac.bd, bsseds.uiu.ac.bd, bssmsj.uiu.ac.bd,
baeng.uiu.ac.bd, bpharm.uiu.ac.bd, bsbge.uiu.ac.bd, bsseco.uiu.ac.bd,
mscse.uiu.ac.bd, msceee.uiu.ac.bd, mba.uiu.ac.bd, emba.uiu.ac.bd,
uiu.ac.bd
```

---

### 🔐 Authentication System

Secure, email-verified authentication restricted to UIU students.

- **Registration** — name, UIU email (domain-whitelisted), optional student ID, password (min 6 chars)
- **Email verification** — 6-digit code sent via Gmail SMTP; 10-minute expiry; individual digit input boxes with auto-advance and paste support
- **Resend verification** — with 60-second cooldown timer
- **Login** — email/password via NextAuth.js Credentials provider; auto-sends new verification code if email is unverified
- **JWT session strategy** — session tokens include user ID and role
- **Role-based access** — `user` and `admin` roles; admin routes protected with `requireAdmin()` middleware

---

## Tech Stack

### Core Framework

| Technology                | Version | Purpose                            |
| ------------------------- | ------- | ---------------------------------- |
| **Next.js**               | 15.1    | React framework (App Router)       |
| **React**                 | 19.0    | UI library                         |
| **TypeScript**            | 5.7     | Type-safe JavaScript               |

### Database & Auth

| Technology                | Version | Purpose                            |
| ------------------------- | ------- | ---------------------------------- |
| **MongoDB**               | —       | Document database                  |
| **Mongoose**              | 8.9     | MongoDB ODM                        |
| **NextAuth.js**           | 4.24    | Authentication (Credentials)       |
| **bcryptjs**              | 2.4     | Password hashing                   |

### UI & Styling

| Technology                | Version | Purpose                            |
| ------------------------- | ------- | ---------------------------------- |
| **Tailwind CSS**          | 3.4     | Utility-first CSS                  |
| **shadcn/ui**             | —       | Radix-based component library      |
| **Radix UI**              | various | Accessible headless primitives     |
| **Framer Motion**         | 11.15   | Animations & transitions           |
| **Lucide React**          | 0.468   | Icon library                       |
| **next-themes**           | 0.4     | Dark/light mode switching          |
| **Recharts**              | 2.15    | Interactive charts                 |
| **Sonner**                | 1.7     | Toast notifications                |
| **cmdk**                  | 1.1     | Command palette / combobox         |

### Utilities & Export

| Technology                | Version | Purpose                            |
| ------------------------- | ------- | ---------------------------------- |
| **pdf2json**              | 4.0     | Server-side PDF text extraction    |
| **jsPDF**                 | 4.1     | Client-side PDF generation         |
| **html2canvas**           | 1.4     | DOM-to-canvas rendering            |
| **xlsx (SheetJS)**        | 0.18    | Excel export                       |
| **ics**                   | 3.8     | Calendar (.ics) event generation   |
| **Nodemailer**            | 7.0     | Email sending (Gmail SMTP)         |
| **Zod**                   | 3.24    | Schema validation                  |

---

## Project Structure

```
UIU-Student-Hub/
├── public/                          # Static assets
│   ├── uiu-logo.svg                 # UIU logo
│   └── CLASS-ROUTINE-253.pdf        # Demo class routine PDF
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (providers, navbar, footer)
│   │   ├── page.tsx                 # Landing / home page
│   │   ├── globals.css              # Global styles (light/dark themes)
│   │   ├── loading.tsx              # Root loading skeleton
│   │   │
│   │   ├── auth/                    # Authentication pages
│   │   │   ├── login/page.tsx       #   Email/password login
│   │   │   ├── register/page.tsx    #   Registration with UIU email
│   │   │   └── verify/page.tsx      #   6-digit email verification
│   │   │
│   │   ├── tools/                   # Academic tools
│   │   │   ├── page.tsx             #   Tools directory (searchable)
│   │   │   ├── cgpa-calculator/     #   CGPA Calculator
│   │   │   ├── section-selector/    #   Section Selector (PDF parser)
│   │   │   ├── fee-calculator/      #   Fee Calculator
│   │   │   └── faculty-review/      #   Faculty Reviews
│   │   │       ├── page.tsx         #     Faculty directory
│   │   │       └── [slug]/page.tsx  #     Faculty detail + reviews
│   │   │
│   │   ├── profile/                 # User profile (authenticated)
│   │   │   ├── page.tsx             #   Personal info
│   │   │   ├── academic/page.tsx    #   Academic overview
│   │   │   ├── faculties/page.tsx   #   Submitted faculty requests
│   │   │   └── reviews/page.tsx     #   User's reviews
│   │   │
│   │   ├── admin/                   # Admin panel (admin role only)
│   │   │   ├── page.tsx             #   Dashboard & stats
│   │   │   ├── users/page.tsx       #   User management
│   │   │   ├── faculty/page.tsx     #   Faculty CRUD
│   │   │   ├── reviews/page.tsx     #   Review moderation
│   │   │   ├── faculty-requests/    #   Request approval workflow
│   │   │   └── domains/page.tsx     #   Email domain management
│   │   │
│   │   └── api/                     # API routes (Next.js Route Handlers)
│   │       ├── auth/                #   Auth endpoints
│   │       ├── cgpa/                #   CGPA record CRUD
│   │       ├── faculty/             #   Faculty listing & requests
│   │       ├── reviews/             #   Review CRUD & reactions
│   │       ├── profile/             #   Profile data & updates
│   │       ├── upload/              #   PDF upload & parsing
│   │       ├── demo-pdf/            #   Demo PDF parser
│   │       └── admin/               #   Admin-only endpoints
│   │
│   ├── components/                  # Shared React components
│   │   ├── navbar.tsx               #   Responsive nav with mobile menu
│   │   ├── auth-provider.tsx        #   NextAuth SessionProvider wrapper
│   │   ├── theme-provider.tsx       #   next-themes ThemeProvider wrapper
│   │   ├── toaster.tsx              #   Sonner toast notifications
│   │   ├── course-card-selector.tsx #   Course selection card component
│   │   ├── schedule-planner.tsx     #   Visual timetable component
│   │   └── ui/                      #   shadcn/ui primitives
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── badge.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── command.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── separator.tsx
│   │       └── sonner.tsx
│   │
│   ├── lib/                         # Utility modules
│   │   ├── auth.ts                  #   NextAuth configuration
│   │   ├── mongodb.ts               #   Mongoose connection singleton
│   │   ├── admin.ts                 #   Admin auth helpers
│   │   ├── validation.ts            #   Email domain & input validation
│   │   ├── email.ts                 #   Nodemailer email service
│   │   ├── grading.ts               #   UIU grading system & CGPA logic
│   │   ├── feeData.ts               #   UIU fee structures & calculators
│   │   ├── exportUtils.ts           #   PDF/PNG/Excel/Calendar export
│   │   └── utils.ts                 #   Tailwind class merger (cn)
│   │
│   └── models/                      # Mongoose schemas
│       ├── User.ts                  #   User accounts
│       ├── Faculty.ts               #   Faculty members
│       ├── Review.ts                #   Faculty reviews
│       ├── CGPARecord.ts            #   Saved CGPA calculations
│       ├── FacultyRequest.ts        #   Faculty addition requests
│       └── Settings.ts              #   App settings (email domains)
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── postcss.config.js
└── LICENSE                          # MIT License
```

---

## Database Models

### User

| Field                | Type       | Description                            |
| -------------------- | ---------- | -------------------------------------- |
| `name`               | String     | Full name                              |
| `email`              | String     | UIU email (unique)                     |
| `password`           | String     | Bcrypt-hashed password                 |
| `studentId`          | String     | Optional numeric student ID            |
| `role`               | Enum       | `user` \| `admin`                      |
| `emailVerified`      | Boolean    | Whether email is verified              |
| `verificationCode`   | String     | 6-digit verification code              |
| `verificationExpires`| Date       | Code expiry timestamp                  |
| `createdAt`          | Date       | Auto-generated                         |
| `updatedAt`          | Date       | Auto-generated                         |

### Faculty

| Field              | Type       | Description                              |
| ------------------ | ---------- | ---------------------------------------- |
| `name`             | String     | Faculty full name                        |
| `initials`         | String     | Unique initials (e.g., "ABC")            |
| `department`       | String     | Department name                          |
| `designation`      | String     | Title (default: "Lecturer")              |
| `email`            | String     | Contact email                            |
| `phone`            | String     | Phone number                             |
| `office`           | String     | Office location                          |
| `website`          | String     | Personal website                         |
| `github`           | String     | GitHub profile                           |
| `linkedin`         | String     | LinkedIn profile                         |
| `scholar`          | String     | Google Scholar profile                   |
| `bio`              | String     | Bio text                                 |
| `addedBy`          | ObjectId   | User who added the faculty               |
| `isApproved`       | Boolean    | Admin approval status                    |
| `averageRating`    | Number     | Denormalized average (0–5)               |
| `totalReviews`     | Number     | Denormalized review count                |
| `ratingBreakdown`  | Object     | `{ teaching, grading, friendliness, availability }` |

*Text index on `name`, `initials`, `department` for search.*

### Review

| Field          | Type        | Description                               |
| -------------- | ----------- | ----------------------------------------- |
| `facultyId`    | ObjectId    | References Faculty                        |
| `userId`       | ObjectId    | References User                           |
| `userName`     | String      | Anonymous display name                    |
| `courseTaken`  | String      | Course code/name                          |
| `trimester`    | String      | e.g., "Spring 2025"                       |
| `ratings`      | Object      | `{ teaching, grading, friendliness, availability }` (1–5 each) |
| `overallRating`| Number      | Average of 4 rating categories            |
| `comment`      | String      | Review text (10–1000 chars)               |
| `difficulty`   | Enum        | `Easy` \| `Medium` \| `Hard`             |
| `wouldTakeAgain`| Boolean    | Recommendation flag                       |
| `likes`        | ObjectId[]  | Users who liked                           |
| `dislikes`     | ObjectId[]  | Users who disliked                        |

*Unique compound index on `(facultyId, userId)` — one review per user per faculty.*

### CGPARecord

| Field            | Type       | Description                            |
| ---------------- | ---------- | -------------------------------------- |
| `userId`         | ObjectId   | References User                        |
| `previousCredits`| Number     | Carried-forward credits                |
| `previousCGPA`   | Number     | Carried-forward CGPA                   |
| `trimesters`     | Array      | `[{ name, courses: [{ name, credit, grade, isRetake, previousGrade }] }]` |
| `results`        | Array      | `[{ trimesterName, gpa, cgpa, trimesterCredits, totalCredits, earnedCredits }]` |

### FacultyRequest

| Field           | Type       | Description                             |
| --------------- | ---------- | --------------------------------------- |
| `name`          | String     | Requested faculty name                  |
| `initials`      | String     | Requested initials                      |
| `department`    | String     | Department                              |
| `designation`   | String     | Title                                   |
| `email` – `bio` | Strings   | Contact & social fields                 |
| `requestedBy`   | ObjectId   | User who submitted                      |
| `status`        | Enum       | `pending` \| `approved` \| `declined`  |
| `adminNote`     | String     | Admin's note on decision                |
| `approvedEdits` | Mixed      | Fields changed by admin during approval |
| `reviewedBy`    | ObjectId   | Admin who reviewed                      |
| `reviewedAt`    | Date       | Review timestamp                        |

### Settings

| Field   | Type    | Description                               |
| ------- | ------- | ----------------------------------------- |
| `key`   | String  | Setting key (unique)                      |
| `value` | Mixed   | Setting value                             |

*Currently used for `allowed_email_domains` storage.*

---

## API Routes

### Authentication

| Method | Endpoint                          | Auth     | Description                                    |
| ------ | --------------------------------- | -------- | ---------------------------------------------- |
| `*`    | `/api/auth/[...nextauth]`         | —        | NextAuth handler (login, session, etc.)        |
| `POST` | `/api/auth/register`              | Public   | Register new account + send verification email |
| `POST` | `/api/auth/verify`                | Public   | Verify email with 6-digit code                 |
| `POST` | `/api/auth/resend-verification`   | Public   | Resend verification code                       |
| `GET`  | `/api/auth/domains`               | Public   | Get allowed email domains                      |

### CGPA

| Method | Endpoint          | Auth      | Description                        |
| ------ | ----------------- | --------- | ---------------------------------- |
| `GET`  | `/api/cgpa`       | User      | Get user's saved CGPA records      |
| `POST` | `/api/cgpa`       | User      | Save a CGPA calculation record     |

### Faculty

| Method | Endpoint                        | Auth     | Description                             |
| ------ | ------------------------------- | -------- | --------------------------------------- |
| `GET`  | `/api/faculty`                  | Public   | List approved faculty (search/filter/sort/paginate) |
| `POST` | `/api/faculty`                  | User     | Submit faculty addition request         |
| `GET`  | `/api/faculty/[id]`             | Public   | Get faculty by ID or slug               |
| `GET`  | `/api/faculty/check-initials`   | Public   | Check initials availability             |

### Reviews

| Method   | Endpoint                          | Auth     | Description                          |
| -------- | --------------------------------- | -------- | ------------------------------------ |
| `GET`    | `/api/reviews`                    | Public   | Get reviews for a faculty (sorted/paginated) |
| `POST`   | `/api/reviews`                    | User     | Create a review                      |
| `PUT`    | `/api/reviews`                    | User     | Update own review                    |
| `DELETE` | `/api/reviews`                    | User     | Delete own review                    |
| `GET`    | `/api/reviews/check-reviewed`     | User     | Check if user reviewed a faculty     |
| `GET`    | `/api/reviews/check-username`     | User     | Check anonymous username availability|
| `GET`    | `/api/reviews/my-usernames`       | User     | Get user's past anonymous usernames  |
| `POST`   | `/api/reviews/react`              | User     | Like/dislike toggle on a review      |

### Profile

| Method  | Endpoint         | Auth     | Description                                  |
| ------- | ---------------- | -------- | -------------------------------------------- |
| `GET`   | `/api/profile`   | User     | Get full profile + academic + reviews + faculties |
| `PATCH` | `/api/profile`   | User     | Update name and student ID                   |

### Upload

| Method | Endpoint          | Auth     | Description                           |
| ------ | ----------------- | -------- | ------------------------------------- |
| `POST` | `/api/upload`     | Public   | Upload and parse a PDF file           |
| `GET`  | `/api/demo-pdf`   | Public   | Parse the bundled demo class routine  |

### Admin

| Method   | Endpoint                              | Auth   | Description                              |
| -------- | ------------------------------------- | ------ | ---------------------------------------- |
| `POST`   | `/api/admin/setup`                    | User   | First-time admin bootstrap               |
| `GET`    | `/api/admin/stats`                    | Admin  | Dashboard statistics                     |
| `GET`    | `/api/admin/users`                    | Admin  | List users (search + paginate)           |
| `PATCH`  | `/api/admin/users/[id]`               | Admin  | Change user role                         |
| `DELETE` | `/api/admin/users/[id]`               | Admin  | Delete a user                            |
| `GET`    | `/api/admin/faculty`                  | Admin  | List all faculty (incl. unapproved)      |
| `POST`   | `/api/admin/faculty`                  | Admin  | Create faculty directly (auto-approved)  |
| `PATCH`  | `/api/admin/faculty/[id]`             | Admin  | Edit faculty                             |
| `DELETE` | `/api/admin/faculty/[id]`             | Admin  | Delete faculty                           |
| `GET`    | `/api/admin/reviews`                  | Admin  | List reviews with moderation view        |
| `DELETE` | `/api/admin/reviews/[id]`             | Admin  | Delete a review                          |
| `GET`    | `/api/admin/faculty-requests`         | Admin  | List faculty requests (filter by status) |
| `POST`   | `/api/admin/faculty-requests`         | User   | Submit new faculty request               |
| `PATCH`  | `/api/admin/faculty-requests/[id]`    | Admin  | Approve/decline a request                |
| `DELETE` | `/api/admin/faculty-requests`         | Admin  | Bulk delete by status                    |
| `GET`    | `/api/admin/domains`                  | Admin  | Get allowed email domains                |
| `PUT`    | `/api/admin/domains`                  | Admin  | Update allowed email domains             |

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or later
- **npm**, **yarn**, or **pnpm**
- **MongoDB** instance (local or cloud — [MongoDB Atlas](https://www.mongodb.com/atlas) recommended)
- **Gmail account** with [App Password](https://myaccount.google.com/apppasswords) for SMTP email sending

### Installation

```bash
# Clone the repository
git clone https://github.com/Sayor00/UIU-Student-Hub.git
cd UIU-Student-Hub

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-random-secret-key

# Gmail SMTP (for email verification & admin notifications)
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Admin notification email (optional — falls back to SMTP_EMAIL)
ADMIN_EMAIL=admin@example.com
```

| Variable         | Required | Description                                                  |
| ---------------- | -------- | ------------------------------------------------------------ |
| `MONGODB_URI`    | Yes      | MongoDB connection string                                    |
| `NEXTAUTH_URL`   | Yes      | Base URL of the app (e.g., `http://localhost:3000`)          |
| `NEXTAUTH_SECRET`| Yes      | Secret key for JWT signing (generate with `openssl rand -base64 32`) |
| `SMTP_EMAIL`     | Yes      | Gmail address for sending emails                             |
| `SMTP_PASSWORD`  | Yes      | Gmail App Password (NOT your regular password)               |
| `ADMIN_EMAIL`    | No       | Email for admin notifications (defaults to `SMTP_EMAIL`)     |

### Running the App

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

The app will be available at **http://localhost:3000**.

### First Admin Setup

1. Register an account with a valid UIU email domain
2. Verify your email with the 6-digit code
3. Log in to your account
4. Navigate to the admin area — if no admin exists yet, you'll be prompted to claim the admin role via the one-time setup endpoint (`POST /api/admin/setup`)
5. Once you're admin, you can promote other users from the Admin → Users panel

---

## Deployment

The app is built with Next.js and can be deployed to any platform that supports Node.js:

- **[Vercel](https://vercel.com)** (recommended) — zero-config deployment for Next.js
- **[Netlify](https://netlify.com)** — with Next.js adapter
- **[Railway](https://railway.app)** / **[Render](https://render.com)** — full-stack hosting
- **Self-hosted** — `npm run build && npm start`

Make sure to:
1. Set all environment variables in your deployment platform
2. Use a production-ready `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
3. Update `NEXTAUTH_URL` to your production domain
4. Ensure your MongoDB instance allows connections from your deployment platform's IP

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ for UIU Students</p>

