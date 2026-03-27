<p align="center">
  <img src="public/uiu-logo.svg" alt="UIU Student Hub Logo" width="80" />
</p>

<h1 align="center">UIU Student Hub</h1>

<p align="center">
  A comprehensive, all-in-one web platform built for <strong>United International University (UIU)</strong> students — featuring academic tools, faculty reviews, schedule planning, real-time chat, and more.
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
  - [Academic Calendar](#-academic-calendar)
  - [Question Bank](#-question-bank--interactive-pdf-viewer)
  - [Fee Calculator](#-fee-calculator)
  - [Faculty Reviews](#-faculty-reviews)
  - [Real-Time Chat](#-real-time-chat)
  - [UCAM Auto-Register Bot](#-ucam-auto-register-bot)
  - [Career Planner](#-career-planner)
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
- A **Real-Time Chat** system with private and group messaging, voice messages, file sharing, polls, and reactions
- A **UCAM Auto-Register Bot** for automated course registration with headless browser automation
- A **Career Planner** for tracking academic progress against career goals
- An **Academic Calendar** with email reminders powered by Upstash QStash
- A **Question Bank** with community-driven exam papers and interactive PDF viewer
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

### 📅 Academic Calendar

A centralized hub for tracking academic timelines, exam schedules, and personal deadlines.

- **Unified Calendar View** — toggle between **Academic** (public) and **Personal** (private) calendars
- **Interactive Grid** — visual indicators for events, deadlines, and comments
- **Smart Filtering** — filter by Program (e.g., Undergraduate, Graduate) and Trimester
- **Real-Time Email Reminders (Upstash QStash)**
  - Receive precise, real-time email notifications exactly when you need them.
  - **Inline Timing Popovers** — set specific countdowns (15m, 1h, 1d) or custom numeric times (e.g., `45 minutes`, `12 hours`).
  - **Daily Digests** — opt-in to receive a daily morning summary email for all events happening that day on a specific calendar.
  - **Recurring Event Support** — apply a reminder to all future occurrences of a weekly class or meeting in one click.
  - **Secure Webhooks** — powered defensively by Upstash QStash to bypass strict serverless function timeouts.
- **Personalization:**
  - **Create custom calendars** for personal study plans or clubs
  - **Add private events**, todos, and notes directly on the calendar grid
  - **Pin calendars** to your dashboard for quick access
- **Todo & Note Integration:**
  - **Deadlines** appear on the calendar with time-specific alerts
  - **Comments** allow you to annotate specific dates with private notes
- **Search & Navigation** — global search for events, comments, and todos with date navigation
- **Export** — download calendars as `.ics` files for Google/Apple Calendar integration

---

### 📂 Question Bank & Interactive PDF Viewer

A robust, community-driven repository for past exam questions and academic materials.

- **Hierarchical Directory** — deeply nested folder structure organized by Program, Course, Year, and Exam Type
- **Advanced View Modes** — toggle between Tile, List, Icon, and Tree view layouts with smooth Framer Motion animations
- **Drag & Drop Uploads** — intuitive file upload queue with SortableJS reordering
- **Smart Merging Engine** — client-side image-to-PDF merging (`jsPDF`) and existing PDF combining (`pdf-lib`) directly in the browser before upload to save bandwidth
- **Native PDF Viewer Integration**
  - **Syncfusion Rendering Engine** — fully offline, high-performance WebAssembly (`pdfium.wasm`) powered PDF viewer
  - **Client-Side OCR** — integrated `Tesseract.js` automatically scans image-based PDFs on-the-fly, generating invisible selectable/highlightable text layers over scanned documents
  - **Annotation Suite** — full support for highlighting, pan/zoom, page navigation, and document printing natively in the browser
- **Community Contributions** — robust moderation queue where student uploads map directly to Admin approval workflows

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
  - **Manual Fee Overrides** — input custom credit fee and term fee to calculate costs without selecting a specific program (useful for specific scholarship scenarios)
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

- **Dashboard Home:**
  - **Greeting** based on time of day
  - **Quick Access** to recently used tools (Automatically prioritized by most recently used and highest usage frequency)
  - **Upcoming Events** list drawn from all your active calendars (Clicking events auto-focuses them in the calendar tool)
  - **Attendance Chart** — horizontal bar chart showing per-course attendance with interactive legend toggles:
    - Click **Present** (green), **Absent** (red), or **Remaining** (gray) to switch views
    - Percentage-normalized bars with raw count labels and custom tooltip showing all three values
    - Data fetched live from UCAM via encrypted credentials
  - **Pinned Calendars** — quick links to your most vital schedules with unpin capability (Direct calendar routing)
  - **Daily Focus** & **Study Tips**
- **UCAM Integration:**
  - **Credential Storage** — securely save UCAM portal credentials (AES-256-GCM encrypted at rest)
  - **Attendance Sync** — live scraping of attendance summary from UCAM portal
  - **Academic Data Sync** — streaming sync API for fetching CGPA, marks, and transcript data with real-time progress updates
  - **Auto-Sync** — optional automatic sync on dashboard load
- **Profile Info** — avatar, name (editable), email, student ID, department, role
- **Academic Stats** — overview of saved CGPA data, credits earned, and trimester performance
- **My Content** — manage your submitted faculty requests and written reviews

---

### 💬 Real-Time Chat

A full-featured messaging system with both a dedicated full-page chat interface and an omnipresent mini chat widget.

- **Private & Group Conversations**
  - Create 1-on-1 private chats or group chats with multiple members
  - Anonymous chat mode — choose a display name for anonymous conversations
  - Group management — rename, add/remove members, role-based admin controls
  - Leave group functionality
- **Rich Text Messaging**
  - **Tiptap Editor** — rich text input with bold, italic, underline, strikethrough, lists, links
  - **@Mentions** — tag users in group chats with autocomplete suggestions; click mentions to start private chats
  - **Emoji Picker** — full emoji-mart integration with native emoji rendering and search
  - **Stickers & GIFs** — built-in sticker packs and GIF picker via unified MediaPicker
- **File Sharing & Media**
  - Upload images, videos, audio, and documents with real-time progress tracking
  - Upload progress bar with estimated time remaining and bytes-per-second calculation
  - Inline media previews (images, video players, audio players)
  - File viewer powered by Syncfusion WebAssembly PDF engine for document previews
  - **Cloudinary** — cloud-based file storage for uploaded media
- **Voice Messages**
  - In-chat voice recording with pause/resume functionality
  - Custom waveform visualizer during recording
  - Interactive playback with progress bar and time display
- **Reactions & Polls**
  - Emoji reactions on messages with quick-react bar (❤️ 😂 👍 😮 😢 🙏)
  - Full emoji picker for custom reactions
  - Interactive poll creation with multiple choice and real-time vote tracking
- **Message Management**
  - **Reply** — single or multi-message replies with visual quote preview and click-to-scroll
  - **Edit** — edit sent messages with edit history indicator
  - **Delete** — delete for me or delete for everyone
  - **Forward** — forward messages to one or multiple conversations with optional message
  - **Copy** — copy message text with formatted timestamps
  - **Multi-Select** — bulk select messages for copy, reply, forward, save media, or delete
- **Context Menus**
  - Custom glass-morphism context menu with backdrop blur on right-click/long-press
  - Mobile-optimized long-press gesture with haptic feedback (vibration)
  - Swipe-to-reply gesture on mobile
  - Chat area context menu (select all / close chat)
- **Real-Time Features**
  - Polling-based real-time message updates (3s interval) with hash-based change detection
  - Typing indicators showing who's currently typing
  - Read receipts (single check → double check → blue double check)
  - Online/offline presence indicators with "last seen" timestamps
  - Presence heartbeat (30s interval)
- **Optimistic UI**
  - Messages appear instantly with sending/sent/failed status
  - Failed message retry and discard
  - Pending messages persisted to localStorage for crash recovery
- **Mini Chat Widget**
  - Floating chat bubbles accessible from any page on the platform
  - Multiple simultaneous chat windows with smart stacking
  - Minimize/restore with animated transitions
  - Full feature parity with the dedicated chat page in a compact form
  - Responsive design — adaptive layout for mobile and desktop
  - Conversation launcher with search, new chat, and new group creation
- **Additional Features**
  - Draft persistence via localStorage (per-conversation)
  - Infinite scroll with scroll position preservation on older message load
  - URL-based conversation routing (`?c=conversationId`)
  - Unread message count badges
  - Conversation search and filtering

---

### 🤖 UCAM Auto-Register Bot

An automated course registration tool for UIU's UCAM portal with three operation modes.

- **Puppeteer Mode** — full headless Chromium automation on the server
  - Automated login, course search, and registration on the UCAM portal
  - Chromium binary downloaded on-demand with caching for subsequent runs
  - Supports Vercel Pro with 5-minute function timeout
- **Fast Mode (Client-Side)** — runs entirely in the browser via a thin CORS proxy
  - Bypasses Vercel's 10-second hobby function timeout
  - API calls proxied through `/api/bot-proxy` to handle CORS restrictions
  - Real-time status updates in the browser UI
- **Hybrid Mode** — combination of server and client-side approaches
- **Security** — bot access requires authentication via `requireBotAccess` middleware
- **Custom Login URL** — configurable UCAM endpoint for different portal versions

---

### 📈 Career Planner

A comprehensive tool to track academic progress against specific career goals and domain requirements.

- **Progress Tracking** — map completed courses against degree requirements
- **Career Goals** — select a target career (e.g., Software Engineering, Data Science) to see required courses
- **Smart Analytics**
  - **Performance by Domain** — breakdown of grades across different CS domains
  - **GPA Trend** — chronological LineChart visualization of term-by-term performance
  - **Grade Distribution** — visual breakdown of all earned grades
  - **Career Fit** — percentage-based match against various career tracks
- **Risk Analysis** — identifies specific low-grade courses that are dragging down CGPA
- **Graduation Scenarios** — calculates final CGPA outcomes based on maintaining specific GPAs for remaining credits

---

### 🛡️ Admin Panel

A comprehensive admin dashboard for platform management.

- **User Management:**
  - Searchable, paginated user list
  - Role management (promote/demote admins)
  - User deletion
- **Faculty Management:**
  - Full CRUD operations for faculty members
  - Faculty image upload via Cloudinary
  - Request moderation (Approve with edits / Decline)
  - Faculty edit request workflows
  - Real-time initials validation
- **Review Moderation:**
  - View full review details and delete inappropriate content
- **Question Bank Moderation:**
  - Approve or reject community-submitted exam papers
- **Domain Management:**
  - Manage allowed email domains for user registration (`*.uiu.ac.bd`, etc.)
- **System Stats** — monitor platform growth and engagement

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

### 🛡️ Security & Encryption

Sensitive user data is encrypted at rest using industry-standard cryptography.

- **Algorithm** — AES-256-GCM (authenticated encryption with associated data)
- **Key management** — 256-bit key derived from `ENCRYPTION_KEY` environment variable via SHA-256
- **IV** — cryptographically random 12-byte initialization vector per encryption operation
- **Auth tag** — GCM authentication tag prevents tampering and ensures data integrity
- **Format** — `base64(iv):base64(authTag):base64(ciphertext)` stored as a single string
- **Encrypted data:**
  - UCAM portal credentials (student ID + password)
  - CGPA records (trimesters, results, credit data)
- **Backward compatibility** — `decrypt()` gracefully handles unencrypted plaintext, enabling zero-downtime migration

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
| **crypto** (Node.js)      | —       | AES-256-GCM encryption at rest     |

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

### Chat & Rich Text

| Technology                     | Version | Purpose                            |
| ------------------------------ | ------- | ---------------------------------- |
| **Tiptap**                     | 2.x     | Rich text editor (ProseMirror)     |
| **emoji-mart**                 | 5.x     | Emoji picker component             |
| **Cloudinary**                 | —       | Cloud media storage for uploads    |
| **react-intersection-observer**| 9.x     | Scroll detection & infinite scroll |

### Automation & Bot

| Technology                | Version | Purpose                            |
| ------------------------- | ------- | ---------------------------------- |
| **Puppeteer / puppeteer-core** | 23.x | Headless browser automation (UCAM bot) |
| **@sparticuz/chromium**   | —       | Chromium binary for serverless     |

### Utilities & Export

| Technology                | Version | Purpose                            |
| ------------------------- | ------- | ---------------------------------- |
| **Upstash QStash**        | 2.x     | Real-time background job scheduling and webhooks |
| **pdf2json**              | 4.0     | Server-side PDF text extraction    |
| **jsPDF**                 | 4.1     | Client-side image-to-PDF generation|
| **pdf-lib**               | 1.17    | Client-side native PDF merging     |
| **html2canvas**           | 1.4     | DOM-to-canvas rendering            |
| **Syncfusion PDF Viewer** | 32.x    | WebAssembly PDF rendering engine   |
| **Tesseract.js**          | 5.1     | Client-side optical character recognition |
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
│   │   ├── dashboard/               # Dashboard (authenticated)
│   │   │   ├── page.tsx             #   Dashboard home
│   │   │   └── academic/            #   Academic overview sub-pages
│   │   │
│   │   ├── tools/                   # Academic tools
│   │   │   ├── page.tsx             #   Tools directory (searchable)
│   │   │   ├── cgpa-calculator/     #   CGPA Calculator
│   │   │   ├── section-planner/     #   Section Selector (PDF parser)
│   │   │   ├── fee-calculator/      #   Fee Calculator
│   │   │   ├── faculty-review/      #   Faculty Reviews
│   │   │   │   ├── page.tsx         #     Faculty directory
│   │   │   │   └── [slug]/page.tsx  #     Faculty detail + reviews
│   │   │   ├── chat/                #   Real-time Chat
│   │   │   │   ├── page.tsx         #     Full chat page (~2400 lines)
│   │   │   │   ├── TiptapChatEditor.tsx  #  Rich text editor
│   │   │   │   ├── MessageContextMenu.tsx # Context menu + emoji picker
│   │   │   │   ├── ContextMenuBase.tsx    # Glass-morphism context menu
│   │   │   │   ├── VoiceMessagePlayer.tsx # Voice recording & playback
│   │   │   │   ├── MentionList.tsx   #     @mention autocomplete
│   │   │   │   ├── constants.ts     #     Emojis, stickers, GIFs
│   │   │   │   └── types.ts         #     Chat type definitions
│   │   │   ├── calendars/           #   Academic Calendar
│   │   │   ├── career-planner/      #   Career Planner
│   │   │   └── question-bank/       #   Question Bank
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
│   │       ├── chat/                #   Chat messaging system
│   │       │   ├── conversations/   #     Conversation CRUD + messages
│   │       │   ├── presence/        #     Online/offline heartbeat
│   │       │   ├── upload/          #     File upload (Cloudinary)
│   │       │   └── users/           #     User search for chat
│   │       ├── faculty/             #   Faculty listing & requests
│   │       ├── faculty-edits/       #   Faculty edit request workflow
│   │       ├── reviews/             #   Review CRUD & reactions
│   │       ├── profile/             #   Profile data & updates
│   │       ├── calendars/           #   Calendar CRUD & events
│   │       ├── courses/             #   Course data
│   │       ├── departments/         #   Department listing
│   │       ├── question-bank/       #   Question bank & submissions
│   │       ├── upload/              #   PDF upload & parsing
│   │       ├── demo-pdf/            #   Demo PDF parser
│   │       ├── auto-register/       #   UCAM bot (Puppeteer mode)
│   │       ├── auto-register-fast/  #   UCAM bot (client-side mode)
│   │       ├── auto-register-hybrid/#   UCAM bot (hybrid mode)
│   │       ├── bot-proxy/           #   CORS proxy for bot API calls
│   │       ├── reminders/           #   Reminder scheduling (QStash)
│   │       ├── qstash/              #   QStash webhook consumers
│   │       ├── comments/            #   Calendar comments
│   │       ├── todos/               #   Calendar todos
│   │       └── admin/               #   Admin-only endpoints
│   │
│   ├── components/                  # Shared React components
│   │   ├── navbar.tsx               #   Responsive nav with mobile menu
│   │   ├── Dashboard.tsx            #   Dashboard home component
│   │   ├── auth-provider.tsx        #   NextAuth SessionProvider wrapper
│   │   ├── theme-provider.tsx       #   next-themes ThemeProvider wrapper
│   │   ├── toaster.tsx              #   Sonner toast notifications
│   │   ├── course-card-selector.tsx #   Course selection card component
│   │   ├── schedule-planner.tsx     #   Visual timetable component
│   │   ├── syncfusion-viewer.tsx    #   WebAssembly PDF viewer + OCR
│   │   ├── faculty-image-uploader.tsx # Cloudinary image upload
│   │   ├── student-id-guard.tsx     #   Student ID requirement gate
│   │   ├── image-viewer.tsx         #   Image lightbox viewer
│   │   ├── chat/                    #   Chat system components
│   │   │   ├── MediaPicker.tsx      #     Emoji/sticker/GIF picker
│   │   │   └── mini/                #     Mini chat widget
│   │   │       ├── MiniChatProvider.tsx  # Global chat state
│   │   │       ├── MiniChatLauncher.tsx  # Floating launcher UI
│   │   │       ├── MiniChatWindow.tsx    # Chat window (~900 lines)
│   │   │       ├── MiniChatSelectBar.tsx # Bulk action bar
│   │   │       ├── MiniChatGroupSettings.tsx # Group mgmt dialog
│   │   │       └── useChatHelpers.ts     # Shared chat utilities
│   │   ├── academic/                #   Academic components
│   │   ├── career-planner/          #   Career planner components
│   │   └── ui/                      #   shadcn/ui primitives (24 files)
│   │
│   ├── lib/                         # Utility modules
│   │   ├── auth.ts                  #   NextAuth configuration
│   │   ├── mongodb.ts               #   Mongoose connection singleton
│   │   ├── encryption.ts            #   AES-256-GCM encrypt/decrypt
│   │   ├── admin.ts                 #   Admin auth helpers
│   │   ├── botAuth.ts               #   Bot access authentication
│   │   ├── validation.ts            #   Email domain & input validation
│   │   ├── email.ts                 #   Nodemailer email service
│   │   ├── cloudinary.ts            #   Cloudinary upload utilities
│   │   ├── grading.ts               #   UIU grading system & CGPA logic
│   │   ├── feeData.ts               #   UIU fee structures & calculators
│   │   ├── exportUtils.ts           #   PDF/PNG/Excel/Calendar export
│   │   ├── pdf-utils.ts             #   PDF parsing helpers
│   │   ├── qstash.ts                #   QStash client & helpers
│   │   ├── send-reminder.ts         #   Reminder email composition
│   │   ├── trimesterUtils.ts        #   Trimester date calculations
│   │   ├── time-format.ts           #   Time formatting utilities
│   │   ├── career-planner/          #   Career planner domain logic
│   │   └── utils.ts                 #   Tailwind class merger (cn)
│   │
│   └── models/                      # Mongoose schemas (22 models)
│       ├── User.ts                  #   User accounts
│       ├── Faculty.ts               #   Faculty members
│       ├── FacultyRequest.ts        #   Faculty addition requests
│       ├── FacultyEditRequest.ts    #   Faculty edit requests
│       ├── Review.ts                #   Faculty reviews
│       ├── CGPARecord.ts            #   Saved CGPA calculations
│       ├── Conversation.ts          #   Chat conversations
│       ├── Message.ts               #   Chat messages
│       ├── ChatPresence.ts          #   Online presence tracking
│       ├── AcademicCalendar.ts      #   Official UIU trimesters
│       ├── UserCalendar.ts          #   Private/custom calendars
│       ├── CalendarComment.ts       #   Date-specific comments
│       ├── CalendarTodo.ts          #   Calendar todos/deadlines
│       ├── EventReminder.ts         #   Precise email schedules
│       ├── DigestReminder.ts        #   Daily digest schedules
│       ├── Course.ts                #   Course catalog
│       ├── Program.ts               #   Academic programs
│       ├── CareerPath.ts            #   Career path definitions
│       ├── SectionData.ts           #   Parsed section/routine data
│       ├── QuestionBank.ts          #   Question bank directories
│       ├── QuestionBankSubmission.ts#   Community submissions
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
| `departments`      | String[]   | Departments (supports multi-department faculty) |
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

*Text index on `name`, `initials`, `departments` for search.*

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

### EventReminder

| Field                | Type       | Description                            |
| -------------------- | ---------- | -------------------------------------- |
| `userId`             | ObjectId   | References User                        |
| `calendarId`         | ObjectId   | The calendar this event belongs to     |
| `eventId`            | String     | Sub-document ID of the single event    |
| `timeReference`      | Date       | The core target date of the event      |
| `timingTags`         | Array      | Human-readable active custom limits    |
| `qstashMessageIds`   | Array      | Upstash Message IDs to use for deletion|

### DigestReminder

| Field                  | Type       | Description                            |
| ---------------------- | ---------- | -------------------------------------- |
| `userId`               | ObjectId   | References User                        |
| `calendarId`           | ObjectId   | The calendar to digest                 |
| `active`               | Boolean    | Whether the digest string is live      |
| `timeString`           | String     | The hour parameter (e.g. `08:00`)      |
| `qstashScheduleId`     | String     | Upstash Schedule ID to use for deletion|

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

### Conversation

| Field              | Type       | Description                              |
| ------------------ | ---------- | ---------------------------------------- |
| `type`             | Enum       | `private` \| `group`                    |
| `name`             | String     | Group name (null for private chats)      |
| `members`          | Array      | `[{ userId, role, anonymousName, joinedAt }]` |
| `isAnonymous`      | Boolean    | Whether the conversation is anonymous    |
| `lastMessage`      | Object     | Denormalized last message preview        |
| `lastActivityAt`   | Date       | Timestamp of last activity               |

### Message

| Field              | Type       | Description                              |
| ------------------ | ---------- | ---------------------------------------- |
| `conversationId`   | ObjectId   | References Conversation                  |
| `senderId`         | ObjectId   | References User                          |
| `senderName`       | String     | Display name (may be anonymous name)     |
| `text`             | String     | Message text (HTML for rich text)        |
| `type`             | Enum       | `text` \| `image` \| `video` \| `file` \| `audio` \| `voice` \| `gif` \| `sticker` \| `poll` \| `system` |
| `attachments`      | Array      | `[{ url, name, size, mimeType }]`        |
| `poll`             | Object     | `{ question, options: [{ text, votes }], multipleChoice }` |
| `reactions`        | Array      | `[{ emoji, userIds }]`                   |
| `readBy`           | ObjectId[] | Users who have seen the message          |
| `replyTo`          | ObjectId[] | IDs of messages being replied to         |
| `edited`           | Boolean    | Whether the message has been edited      |
| `deletedForAll`    | Boolean    | Soft-deleted for all participants        |
| `deletedFor`       | ObjectId[] | Users who individually deleted           |

### ChatPresence

| Field              | Type       | Description                              |
| ------------------ | ---------- | ---------------------------------------- |
| `userId`           | ObjectId   | References User (unique)                 |
| `lastSeen`         | Date       | Last heartbeat timestamp                 |
| `isOnline`         | Boolean    | Computed from lastSeen (virtual field)   |

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

### UCAM Integration

| Method | Endpoint                    | Auth   | Description                                          |
| ------ | --------------------------- | ------ | ---------------------------------------------------- |
| `GET`  | `/api/user/credentials`     | User   | Check if UCAM credentials are stored                 |
| `POST` | `/api/user/credentials`     | User   | Save encrypted UCAM credentials                      |
| `GET`  | `/api/user/attendance`      | User   | Fetch live attendance summary from UCAM              |
| `POST` | `/api/user/sync-results`    | User   | Stream-sync academic data from UCAM                  |
| `GET`  | `/api/user/sync-check`      | User   | Check if UCAM data has changed (fingerprint check)   |
| `GET`  | `/api/user/preferences`     | User   | Get user preferences                                 |
| `PATCH`| `/api/user/preferences`     | User   | Update user preferences                              |

### Upload

| Method | Endpoint          | Auth     | Description                           |
| ------ | ----------------- | -------- | ------------------------------------- |
| `POST` | `/api/upload`     | Public   | Upload and parse a PDF class routine  |
| `GET`  | `/api/demo-pdf`   | Public   | Parse the bundled demo class routine  |

### Reminders (Upstash QStash)

| Method   | Endpoint                          | Auth   | Description                              |
| -------- | --------------------------------- | ------ | ---------------------------------------- |
| `POST`   | `/api/reminders`                  | User   | Construct and schedule specific QStash timings for an event |
| `DELETE` | `/api/reminders`                  | User   | Delete saved timings and cancel QStash queue for an event |
| `POST`   | `/api/reminders/digest`           | User   | Setup or disable calendar-level Daily Digests             |
| `POST`   | `/api/reminders/bulk`             | User   | Apply reminder offsets across all events in a calendar    |
| `POST`   | `/api/qstash/send-reminder`       | System | Verified Webhook consumer triggered by Upstash Servers    |

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

### Chat

| Method   | Endpoint                                          | Auth   | Description                              |
| -------- | ------------------------------------------------- | ------ | ---------------------------------------- |
| `GET`    | `/api/chat/conversations`                         | User   | List user's conversations with unread counts |
| `POST`   | `/api/chat/conversations`                         | User   | Create private or group conversation     |
| `GET`    | `/api/chat/conversations/[id]`                    | User   | Get conversation details                 |
| `DELETE` | `/api/chat/conversations/[id]`                    | User   | Clear chat / leave conversation          |
| `PATCH`  | `/api/chat/conversations/[id]`                    | User   | Update group (rename, add/remove members)|
| `GET`    | `/api/chat/conversations/[id]/messages`           | User   | Get messages (paginated with cursor)     |
| `POST`   | `/api/chat/conversations/[id]/messages`           | User   | Send a message                           |
| `PATCH`  | `/api/chat/conversations/[id]/messages/[msgId]`   | User   | Edit a message                           |
| `DELETE` | `/api/chat/conversations/[id]/messages/[msgId]`   | User   | Delete message (for me / for all / bulk) |
| `POST`   | `/api/chat/conversations/[id]/messages/[msgId]/react` | User | Toggle emoji reaction on a message   |
| `POST`   | `/api/chat/conversations/[id]/typing`             | User   | Send typing indicator                    |
| `DELETE` | `/api/chat/conversations/[id]/typing`             | User   | Clear typing indicator                   |
| `POST`   | `/api/chat/conversations/[id]/poll`               | User   | Vote on a poll                           |
| `POST`   | `/api/chat/presence`                              | User   | Heartbeat for online presence            |
| `POST`   | `/api/chat/upload`                                | User   | Upload file to Cloudinary for chat       |
| `GET`    | `/api/chat/users/search`                          | User   | Search users for new chat creation       |

### Auto-Register Bot

| Method | Endpoint                      | Auth   | Description                              |
| ------ | ----------------------------- | ------ | ---------------------------------------- |
| `POST` | `/api/auto-register`          | User   | UCAM registration (Puppeteer mode)       |
| `POST` | `/api/auto-register-fast`     | User   | UCAM registration (client-side mode)     |
| `POST` | `/api/auto-register-hybrid`   | User   | UCAM registration (hybrid mode)          |
| `POST` | `/api/bot-proxy`              | User   | CORS proxy for UCAM API calls            |

### Question Bank

| Method | Endpoint                              | Auth   | Description                              |
| ------ | ------------------------------------- | ------ | ---------------------------------------- |
| `GET`  | `/api/question-bank`                  | Public | List question bank directories/files     |
| `POST` | `/api/question-bank/submissions`      | User   | Submit files for admin review            |

### Miscellaneous

| Method | Endpoint               | Auth   | Description                              |
| ------ | ---------------------- | ------ | ---------------------------------------- |
| `GET`  | `/api/courses`         | Public | Get course catalog data                  |
| `GET`  | `/api/departments`     | Public | Get department listing                   |
| `POST` | `/api/faculty-edits`   | User   | Submit faculty edit request              |
| `GET`  | `/api/comments`        | User   | Calendar date comments                   |
| `GET`  | `/api/todos`           | User   | Calendar todos                           |

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
git clone https://github.com/TahsinFaiyaz30/UIU-Student-Hub.git
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

# Encryption (for sensitive data at rest)
ENCRYPTION_KEY=your-secure-encryption-key-min-32-chars

# Gmail SMTP (for email verification & admin notifications)
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Admin notification email (optional — falls back to SMTP_EMAIL)
ADMIN_EMAIL=admin@example.com

# Cloudinary (file uploads for chat & faculty images)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Upstash QStash (Real-Time Background Job Scheduling)
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key
```

| Variable                     | Required | Description                                                  |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| `MONGODB_URI`                | Yes      | MongoDB connection string                                    |
| `NEXTAUTH_URL`               | Yes      | Base URL of the app (e.g., `http://localhost:3000`)          |
| `NEXTAUTH_SECRET`            | Yes      | Secret key for JWT signing (generate with `openssl rand -base64 32`) |
| `ENCRYPTION_KEY`             | Yes      | Key for AES-256-GCM encryption of sensitive data (generate with `openssl rand -base64 32`). Falls back to `NEXTAUTH_SECRET` if not set |
| `SMTP_EMAIL`                 | Yes      | Gmail address for sending emails                             |
| `SMTP_PASSWORD`              | Yes      | Gmail App Password (NOT your regular password)               |
| `CLOUDINARY_CLOUD_NAME`      | Yes      | Cloudinary cloud name for file uploads                       |
| `CLOUDINARY_API_KEY`         | Yes      | Cloudinary API key                                           |
| `CLOUDINARY_API_SECRET`      | Yes      | Cloudinary API secret                                        |
| `QSTASH_TOKEN`               | Yes      | API Token to interface with Upstash Scheduling               |
| `QSTASH_CURRENT_SIGNING_KEY` | Yes      | Used to verify incoming HTTP traffic dynamically sourced from Upstash limits |
| `QSTASH_NEXT_SIGNING_KEY`    | Yes      | Rotating backup key required by Upstash verify function      |

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
