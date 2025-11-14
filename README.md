# ⚽ Football Statistics Tracker

A comprehensive web application for tracking and managing football team statistics, player performance, and match results. Built with modern web technologies, this application provides a complete solution for internal team management with real-time updates, detailed analytics, and an intuitive admin interface.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [API Routes](#api-routes)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The Football Statistics Tracker is designed for managing company or team football matches. It provides a complete solution for:

- **Player Management**: Register, approve, and manage player profiles with photos and positions
- **Match Tracking**: Record internal and external matches with detailed statistics
- **Real-time Statistics**: Track goals, assists, cards, clean sheets, saves, and minutes played
- **Leaderboards**: Multiple leaderboard categories showcasing top performers
- **Admin Panel**: Comprehensive admin interface for managing all aspects of the system
- **Public Statistics**: Beautiful public-facing statistics page for showcasing team performance

## ✨ Features

### 🔐 Authentication & User Management
- **Email/Password Authentication**: Secure login and registration via Supabase Auth
- **User Approval System**: Admin-controlled user approval workflow (pending → approved → rejected)
- **Role-Based Access Control**: Separate roles for admins and players
- **User Profiles**: Extended profiles with position, phone, and photo upload
- **Session Management**: Automatic session refresh and secure logout

### 👥 Player Management
- **Player Registration**: Self-registration with admin approval workflow
- **Player Profiles**:
  - Profile photos with Supabase Storage integration
  - Jersey numbers and preferred positions
  - Contact information (email, phone)
  - Player statistics aggregation
- **Player Search & Filter**: Real-time search by name, email, position, or jersey number
- **Player Statistics**: Individual player pages with detailed match history and stats
- **Real-time Updates**: Automatic UI updates when player data changes

### 🏆 Match Management
- **Match Types**: Support for both internal and external matches
- **Match Creation**:
  - Date, time, and location tracking
  - Opponent information for external matches
  - Team assignment (Team A vs Team B)
  - Match status tracking (scheduled, in_progress, completed)
- **Player Assignment**: Assign players to teams for each match
- **Score Tracking**: Update match scores with real-time UI updates
- **Match Details**: Comprehensive match view with:
  - Team lineups
  - Individual player statistics per match
  - Goals, assists, cards, minutes played
  - Clean sheets and saves (for goalkeepers)
- **Match Filtering**: Filter by status (scheduled, in_progress, completed) and type (internal, external)
- **Match Search**: Search matches by teams, location, or status

### 📊 Statistics & Analytics
- **Comprehensive Statistics Tracking**:
  - Goals scored
  - Assists provided
  - Yellow and red cards
  - Minutes played
  - Clean sheets (for defenders/goalkeepers)
  - Saves (for goalkeepers)
- **Multiple Leaderboards**:
  - Top Goal Scorers
  - Top Assist Makers
  - Top Performers (Goals + Assists combined)
  - Most Active Players (matches played)
  - Goals per Match (efficiency)
  - Most Minutes Played
  - Top Clean Sheets
  - Top Saves
- **Player Statistics Pages**: Individual player pages showing:
  - Total goals, assists, cards
  - Matches played and minutes
  - Match-by-match breakdown
  - Performance trends
- **Dashboard Overview**:
  - Total players, matches, goals
  - Top scorers and assisters
  - Recent and upcoming matches
  - Quick statistics cards

### 🎨 Public Statistics Page
- **Beautiful Landing Page**: Modern, gradient-based design
- **Upcoming Match Banner**: Highlighted next match with countdown
- **Overview Statistics**: Key metrics at a glance
- **Top Performers**: Visual leaderboards with rankings
- **Recent Matches**: Latest match results with winner indicators
- **Responsive Design**: Mobile-friendly layout

### 🛡️ Admin Panel
- **Admin Dashboard**:
  - System statistics overview
  - Pending player approvals
  - Recent activity feed
  - Quick action buttons
- **Player Management**:
  - Create, edit, and delete players
  - Approve/reject player registrations
  - Update player information
- **Match Management**:
  - Create new matches
  - Update match details and scores
  - Assign players to teams
  - Update individual player statistics per match
  - Delete matches (with cascade deletion)
- **System Administration**:
  - View all users and their status
  - Manage user roles
  - System health monitoring

### 🎯 User Experience Features
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Real-time Updates**: Supabase Realtime subscriptions for live data
- **Loading States**: Skeleton loaders and loading indicators
- **Error Handling**: Comprehensive error messages and fallbacks
- **Toast Notifications**: User-friendly success/error notifications
- **Search & Filter**: Advanced filtering across all major pages
- **Image Upload**: Profile photo uploads with preview
- **Protected Routes**: Route protection based on authentication and roles
- **Sidebar Navigation**: Collapsible sidebar with mobile support

## 🛠️ Tech Stack

### Frontend
- **Next.js 14.0.4**: React framework with App Router
  - Server Components for SSR data fetching
  - Client Components for interactive UI
  - API Routes for backend operations
- **React 18**: UI library with hooks
- **TypeScript 5**: Type-safe development
- **Tailwind CSS 3.3.0**: Utility-first CSS framework
- **shadcn/ui**: High-quality component library built on Radix UI
  - Card, Button, Input, Badge, Toast components
  - Accessible and customizable
- **Lucide React**: Modern icon library
- **React Context API**: Global state management for user authentication

### Backend & Database
- **Supabase**: Backend-as-a-Service
  - **PostgreSQL Database**: Relational database with Row Level Security
  - **Supabase Auth**: Authentication and user management
  - **Supabase Storage**: File storage for player photos
  - **Supabase Realtime**: Real-time database subscriptions
- **Row Level Security (RLS)**: Database-level security policies

### Development Tools
- **ESLint**: Code linting with Next.js config
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing
- **TypeScript**: Static type checking

### Deployment
- **Vercel**: Hosting and deployment platform
- **Environment Variables**: Secure configuration management

## 📁 Project Structure

```
football_stats/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API route handlers
│   │   ├── admin-dashboard/      # Admin dashboard data
│   │   ├── create-admin/         # Admin creation utility
│   │   ├── create-match/         # Match creation
│   │   ├── create-player/        # Player creation
│   │   ├── dashboard/            # Main dashboard data
│   │   ├── leaderboards/          # Leaderboard data
│   │   ├── match-details/        # Match details API
│   │   ├── matches/              # Matches CRUD
│   │   ├── player-stats/         # Player statistics
│   │   ├── players/              # Players CRUD
│   │   ├── stats-page/           # Public stats page data
│   │   └── update-*/             # Various update endpoints
│   ├── admin/                    # Admin pages
│   │   ├── create-match/         # Match creation form
│   │   ├── create-player/        # Player creation form
│   │   └── page.tsx              # Admin dashboard
│   ├── auth/                     # Authentication pages
│   │   ├── login/                # Login page
│   │   └── register/             # Registration page
│   ├── dashboard/                # Main dashboard
│   ├── leaderboards/             # Leaderboards page
│   ├── matches/                  # Matches pages
│   │   └── [id]/                 # Match details page
│   ├── player/                   # Player detail pages
│   │   └── [id]/                 # Individual player page
│   ├── players/                  # Players list page
│   ├── stats/                    # Public statistics page
│   ├── layout.tsx                # Root layout with sidebar
│   ├── globals.css               # Global styles
│   └── page.tsx                  # Home/redirect page
├── components/                    # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── toast.tsx
│   ├── AdminCreationUtility.tsx  # Admin creation component
│   ├── ImageUpload.tsx           # Image upload component
│   ├── MatchCard.tsx             # Match card component
│   ├── MatchCreationForm.tsx    # Match creation form
│   ├── MatchDetailsModal.tsx    # Match details modal
│   ├── MatchDetailsView.tsx     # Match details view
│   ├── MobileHeader.tsx         # Mobile navigation header
│   ├── PendingApprovalsCard.tsx # Pending approvals component
│   ├── PlayerAvatar.tsx         # Player avatar component
│   ├── PlayerCard.tsx           # Player card component
│   ├── PlayerCreationForm.tsx   # Player creation form
│   ├── PlayerEditModal.tsx      # Player edit modal
│   ├── ProtectedRoute.tsx      # Route protection HOC
│   ├── ScoreUpdateModal.tsx     # Score update modal
│   ├── Sidebar.tsx              # Navigation sidebar
│   └── TopHeader.tsx            # Top header component
├── context/                      # React Context providers
│   └── UserContext.tsx          # User authentication context
├── lib/                          # Utility libraries
│   ├── api.ts                   # API helper functions
│   ├── auth.ts                  # Authentication helpers
│   ├── supabaseClient.ts        # Supabase client configuration
│   ├── useRefresh.ts            # Refresh hook
│   └── utils.ts                 # General utilities
├── types/                        # TypeScript type definitions
│   └── index.ts                 # All type definitions
├── public/                       # Static assets
│   ├── favicon.ico
│   └── favicon.svg
├── archive/                      # Archived SQL files
│   └── sql-files/               # Database migration files
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── env.example                  # Environment variables template
└── README.md                     # This file
```

## 🗄️ Database Schema

### Core Tables

#### `user_profiles`
Extends Supabase Auth users with additional profile information.
- `id` (UUID, Primary Key, References auth.users)
- `email` (TEXT, Unique)
- `name` (TEXT, Required)
- `position` (TEXT, Optional) - Player position
- `phone` (TEXT, Optional)
- `photo_url` (TEXT, Optional) - Supabase Storage URL
- `role` (TEXT) - 'admin' or 'player'
- `status` (TEXT) - 'pending', 'approved', or 'rejected'
- `approved_at` (TIMESTAMP, Optional)
- `approved_by` (UUID, Optional, References auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### `players`
Player-specific information linked to user profiles.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Unique, References user_profiles)
- `jersey_number` (INTEGER, Optional)
- `preferred_position` (TEXT, Optional)
- `created_at`, `updated_at` (TIMESTAMP)

#### `matches`
Match information and results.
- `id` (UUID, Primary Key)
- `type` (TEXT) - 'internal' or 'external'
- `date` (TIMESTAMP, Required)
- `opponent` (TEXT, Optional) - For external matches
- `location` (TEXT, Optional)
- `status` (TEXT) - 'scheduled', 'in_progress', 'completed'
- `score_teamA` (INTEGER, Default: 0)
- `score_teamB` (INTEGER, Default: 0)
- `created_by` (UUID, References auth.users)
- `created_at`, `updated_at` (TIMESTAMP)

#### `teams`
Teams for each match (Team A, Team B, or custom names).
- `id` (UUID, Primary Key)
- `match_id` (UUID, References matches, Cascade Delete)
- `name` (TEXT, Required) - 'Team A', 'Team B', or custom
- `color` (TEXT, Optional) - Team color
- `created_at` (TIMESTAMP)

#### `match_players`
Junction table linking players to matches and teams.
- `id` (UUID, Primary Key)
- `match_id` (UUID, References matches, Cascade Delete)
- `player_id` (UUID, References players, Cascade Delete)
- `team_id` (UUID, References teams, Cascade Delete)
- `position` (TEXT, Optional) - Player position in this match
- `created_at` (TIMESTAMP)
- Unique constraint on (match_id, player_id)

#### `stats`
Individual player statistics per match.
- `id` (UUID, Primary Key)
- `match_player_id` (UUID, Unique, References match_players, Cascade Delete)
- `goals` (INTEGER, Default: 0)
- `assists` (INTEGER, Default: 0)
- `yellow_cards` (INTEGER, Default: 0)
- `red_cards` (INTEGER, Default: 0)
- `minutes_played` (INTEGER, Default: 90)
- `clean_sheets` (INTEGER, Default: 0) - For defenders/goalkeepers
- `saves` (INTEGER, Default: 0) - For goalkeepers
- `created_at`, `updated_at` (TIMESTAMP)

### Indexes
- Email, role, and status indexes on `user_profiles`
- Date and status indexes on `matches`
- Match and player indexes on `match_players`
- Match player index on `stats`

### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- **Admins**: Full CRUD access
- **Players**: Read access to approved data
- **Public**: Limited read access for public statistics

## 🔒 Authentication & Authorization

### Authentication Flow
1. **Registration**: Users register with email/password via Supabase Auth
2. **Profile Creation**: User profile created with 'pending' status
3. **Admin Approval**: Admin approves/rejects user registration
4. **Access Control**: Only approved users can access protected routes

### Role-Based Access Control
- **Admin Role**:
  - Full access to all features
  - Can create/edit/delete players and matches
  - Can approve/reject user registrations
  - Access to admin dashboard
- **Player Role**:
  - View own profile and statistics
  - View public statistics and leaderboards
  - View matches and player information
  - Cannot modify data

### Protected Routes
- `/dashboard` - Requires approved user
- `/admin/*` - Requires admin role and approved status
- `/players`, `/matches` - Public read, admin write
- `/leaderboards`, `/stats` - Public access

## 🔌 API Routes

### Authentication & User Management
- `POST /api/create-admin` - Create admin user (development only)
- User authentication handled via Supabase Auth client-side

### Player Management
- `GET /api/players` - Get all players
- `GET /api/players/[id]` - Get player details
- `POST /api/create-player` - Create new player (admin only)
- `PUT /api/update-player` - Update player (admin only)
- `DELETE /api/players/[id]` - Delete player (admin only)

### Match Management
- `GET /api/matches` - Get all matches
- `GET /api/matches/[id]` - Get match details
- `POST /api/create-match` - Create new match (admin only)
- `PUT /api/update-match-info` - Update match information (admin only)
- `PUT /api/update-match-score` - Update match score (admin only)
- `PUT /api/update-match-details` - Update match details and player stats (admin only)
- `PUT /api/update-team-players` - Update team player assignments (admin only)
- `DELETE /api/matches/[id]` - Delete match (admin only)

### Statistics & Analytics
- `GET /api/dashboard` - Get dashboard statistics
- `GET /api/leaderboards` - Get all leaderboard data
- `GET /api/player-stats` - Get player statistics
- `GET /api/stats-page` - Get public statistics page data
- `GET /api/match-details/[id]` - Get detailed match information

### Admin
- `GET /api/admin-dashboard` - Get admin dashboard data

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm
- Supabase account and project
- Git (for version control)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd football_stats
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ADMIN_CREATION_SECRET_KEY=your_secret_key
   NEXT_PUBLIC_ADMIN_CREATION_KEY=your_secret_key
   ```

4. **Set up Supabase Database**
   - Run the SQL schema from `supabase-schema-fixed.sql` in your Supabase SQL Editor
   - Enable Row Level Security on all tables
   - Set up storage bucket for player photos (if using image uploads)

5. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Creating the First Admin User

1. **Using the Admin Creation Utility** (Development only)
   - Navigate to `/create-admin`
   - Enter admin credentials
   - Use the secret key from environment variables

2. **Using SQL** (Production recommended)
   ```sql
   -- Insert admin user profile
   INSERT INTO user_profiles (id, email, name, role, status)
   VALUES (
     'user-uuid-from-auth',
     'admin@example.com',
     'Admin User',
     'admin',
     'approved'
   );
   ```

## 🔧 Environment Variables

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional Variables
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side admin operations
- `ADMIN_CREATION_SECRET_KEY` - Secret key for admin creation utility
- `NEXT_PUBLIC_ADMIN_CREATION_KEY` - Public key for admin creation (should match secret)

## 📦 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Import your GitHub repository
   - Set environment variables in Vercel dashboard
   - Deploy

3. **Configure Supabase**
   - Add Vercel domain to Supabase allowed origins
   - Verify RLS policies work in production

See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

### Environment Variables for Production
Set all environment variables in your hosting platform (Vercel, etc.):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if needed)
- `ADMIN_CREATION_SECRET_KEY` (if using admin utility)
- `NODE_ENV=production`

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style
- TypeScript for type safety
- Functional React components with hooks
- Async/await for all async operations
- Semantic HTML and accessibility
- Tailwind CSS for styling
- shadcn/ui components for UI consistency

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write TypeScript with proper types
- Use functional components and hooks
- Add error handling for all async operations
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Shamim Ahmed**

- Built with ❤️ for tracking football team statistics
- Part of the SovWare Football Statistics system

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Components from [shadcn/ui](https://ui.shadcn.com/)
- Backend powered by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**⚽ Happy Tracking!**
