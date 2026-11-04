# Community Developer Hub — Project Showcase, Collaboration & Developer Network

A production-ready platform where members of a coding and technology community can showcase software projects, find skilled collaborators, recruit teammates, earn auditable contribution streaks, compete on gamified leaderboards, and get recognized through Community Spotlight social campaigns.

Built with a **Strict Zero-Cost Architecture (₹0 / $0 Budget)** utilizing modern, free-tier cloud infrastructure.

---

## 🌟 Key Features

1. **Software Project Showcase**:
   - Rich project detail pages with cover media, screenshots gallery, live deployment URLs, repository links, and demo videos.
   - Status indicators (`Idea`, `Looking for Collaborators`, `In Progress`, `Completed`, `Archived`).
   - Standardized technology stack tags and category filters.

2. **Project Discovery & Feed**:
   - Community feeds: Recommended, Latest, Trending (weighted engagement algorithm), Highest Rated, Spotlight Featured, and Looking for Collaborators.
   - Real-time search across project titles, descriptions, technologies, and creator names.

3. **Developer Portfolios**:
   - Public-facing developer portfolios at `/profile/[username]`.
   - Technical skills offered & needed, availability status (`Open to Collaborate`, `Available`, `Mentoring`, `Busy`).
   - Project showcase, team collaborations, unlocked achievement badges, and recent activity logs.

4. **Collaboration Marketplace**:
   - Project creators publish structured collaboration opportunities with required roles, skill requirements, and time commitments.
   - Smart Skill Matching engine matches open roles with community members who offer those exact skills.
   - Member application workflow with experience notes and portfolio links, protected against duplicate requests.
   - Project owner review console to accept or decline applicants and assign project roles.

5. **Team Workspaces**:
   - Collaborative Kanban task board (`To Do`, `In Progress`, `Under Review`, `Completed`).
   - Project updates feed with version tags (publishing genuine technical updates awards points and daily streak counts).
   - Milestones timeline tracker.

6. **Peer Reviews & Multi-Dimensional Ratings**:
   - Structured 5-dimension project evaluations:
     - Technical Implementation
     - Innovation & Creativity
     - Design & Usability
     - Documentation & Clarity
     - Practical Utility
   - Automated rating calculations via PostgreSQL triggers.
   - Anti-gaming protection preventing creators from self-rating.

7. **Meaningful Coding Streaks & Points Ledger**:
   - Zero-vanity streak engine: Page views, logins, and idle browsing **never** count toward streaks.
   - Only verified engineering actions qualify (project publication, accepted contribution, task completion, substantive review, challenge submission).
   - Daily calendar uniqueness & anti-farming safeguards.

8. **Community Spotlight & Social Media Card Generator**:
   - Nomination and editorial approval workflow for outstanding community builds.
   - Client-side High-Resolution Graphic Synthesizer (Instagram Post 1:1 and Instagram Story 9:16) rendered via HTML5 Canvas with custom color palettes and instant PNG export (₹0 cost).

9. **Competitions, Events & In-App Notifications**:
   - Community challenges and hackathons with project entry submissions.
   - Event registrations for tech talks and workshops.
   - Real-time in-app notification center for collaboration requests, comments, reviews, and achievements.

10. **Administration Console**:
    - Real database analytics (registered members, projects published, completed builds, open collaborations, total contributions).
    - Member management (role assignment, suspend/reactivate).
    - Project moderation and Spotlight approval.
    - Community announcements broadcaster.
    - Tamper-evident admin audit logs.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router, Turbopack, Partial Prerendering, React 19)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4, Lucide React, Next-Themes (Light/Dark mode)
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS) policies, Triggers, and Functions
- **Authentication**: Supabase Auth with SSR cookies (`@supabase/ssr`)
- **Hosting**: Vercel (Hobby Tier) & Supabase Free Tier ($0 / ₹0 operational budget)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+
- A free account on [Supabase](https://supabase.com) (₹0 cost)
- A free account on [Vercel](https://vercel.com) (₹0 cost)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-org/community-developer-hub.git
cd community-developer-hub
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup & Migrations
1. In your Supabase dashboard, open the **SQL Editor**.
2. Run the migration script located at:
   ```
   supabase/migrations/20261104000000_initial_schema.sql
   ```
   This creates all 30+ tables, custom enums, PostgreSQL triggers (metrics recalculation, new user profile handler), RLS policies, and the anti-gaming streak calculation function.
3. Run the initial seed script located at:
   ```
   supabase/seed.sql
   ```
   This populates default technology tags, community achievement badges, and platform settings.

> **Note on Initial Admin**: The first user who registers on the platform is automatically designated as `super_admin` by the database trigger, providing immediate administrative access without exposing public admin routes.

### 5. Running Locally
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Running Tests & Verification
Run the verification test suite:
```bash
npm test
```
Build the production application:
```bash
npm run build
```

---

## 🚢 Deployment to Vercel (Zero-Cost Guide)

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/community-developer-hub.git
   git push -u origin main
   ```
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL, e.g. `https://your-app.vercel.app`)
5. Click **Deploy**. Vercel will build and deploy the application with zero hosting costs.
6. In your Supabase dashboard under **Authentication > URL Configuration**, add your Vercel domain to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```

---

## 📄 License
Open source under the [MIT License](LICENSE).
