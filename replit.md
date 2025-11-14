# PersonalFinance Pro

## Overview

PersonalFinance Pro is a comprehensive personal finance management application that applies professional double-entry bookkeeping and accounting principles to personal and family wealth management. The system provides complete financial visibility through balance sheets, cash flow analysis, budgeting, goal tracking, and AI-powered financial insights. Built as a full-stack web application with React frontend and Express backend, it empowers users to manage their finances with the same rigor that successful businesses use.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite for build tooling and development server

**UI Framework**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling

**State Management**: 
- TanStack React Query for server state management and API data fetching
- React Context API for authentication state
- Local component state for UI interactions

**Routing**: Wouter for lightweight client-side routing

**Design System**:
- Professional color palette with Professional Blue (#2A5D9F), Sage Green (#7C9885), and Warm Gold (#E6C97A)
- Inter font for UI text, JetBrains Mono for financial data
- 8px base spacing unit with responsive breakpoints
- Component variants following New York style from Shadcn

**Key Pages**:
- Dashboard with financial health score and key metrics
- Accounts management with categorized views
- Transaction entry with double-entry support
- Budget tracking with spending analysis
- Goal management with progress tracking
- Balance sheet and cash flow reports

### Backend Architecture

**Framework**: Express.js on Node.js with TypeScript

**API Design**: RESTful API with approximately 40 endpoints covering:
- User authentication and management
- Account CRUD operations
- Transaction creation with double-entry validation
- Budget and goal management
- Analytics and reporting endpoints
- AI recommendations

**Business Logic**:
- Double-entry bookkeeping validation ensuring debits equal credits
- Automatic account balance updates on transaction creation
- Financial ratio calculations (savings rate, debt-to-income)
- Budget progress tracking and spending analysis
- Financial health score computation

**Security**:
- Helmet.js for security headers
- Rate limiting on API endpoints
- Data encryption for sensitive information using crypto-js
- CSRF protection and trust proxy configuration for Replit environment
- Bcrypt for password hashing

### Data Storage

**Database**: PostgreSQL accessed via Neon serverless driver

**ORM**: Drizzle ORM for type-safe database operations with schema-first approach

**Schema Design** (Double-Entry Accounting):
- **users**: User accounts with authentication credentials
- **accounts**: Chart of accounts (assets, liabilities, income, expenses) with categories
- **transactions**: Financial transactions with total amounts
- **transactionEntries**: Individual debit/credit entries implementing double-entry bookkeeping
- **budgets**: Budget allocations by category and time period
- **goals**: Financial goals with target amounts and deadlines
- **savingsRecommendations**: AI-generated savings opportunities
- **families** and **familyMembers**: Multi-user family account support (future enhancement)

**Key Constraints**:
- Transaction entries must balance (sum of debits equals sum of credits)
- Account balances updated atomically with transaction creation
- Soft deletes with isActive flags

### Authentication and Authorization

**Current Implementation**: Demo mode with mock authentication for development

**Planned Implementation**:
- Session-based authentication with secure HTTP-only cookies
- JWT tokens for API authorization
- Role-based access control for family accounts
- Password reset and email verification flows

**Note**: Full authentication is intentionally deferred to focus on core financial features first. Demo user automatically created on server startup.

### External Dependencies

**AI Services**:
- Google Gemini AI (gemini-2.0-flash-exp model) for:
  - Expense prediction based on historical patterns
  - Financial insights generation
  - Personalized savings recommendations
- Configurable via GEMINI_API_KEY environment variable (optional)

**UI Components**:
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling
- Recharts for data visualization (mentioned in documentation)

**File Processing**:
- Multer for file upload handling
- PapaParse for CSV import (feature disabled pending account mapping)
- ofx-js for OFX format import (feature disabled pending account mapping)

**Database**:
- Neon serverless PostgreSQL with WebSocket support
- Connection pooling for production performance

**Development Tools**:
- Drizzle Kit for database migrations
- ESBuild for production builds
- Vitest and Supertest for testing (setup in progress)

**Import/Export Limitations**:
- CSV and OFX import functionality currently disabled until account mapping configuration is implemented
- These features require user-defined mappings to convert external transaction data into proper double-entry journal entries

**Deployment Considerations**:
- Application designed for Replit deployment environment
- Trust proxy enabled for proper IP handling
- Environment variables required: DATABASE_URL, optional ENCRYPTION_KEY and GEMINI_API_KEY
- PWA manifest included for offline capability (future enhancement)

## Recent Changes

### October 27, 2025 - Goal Creation Bug Fix

**Issue**: Goal creation was failing with validation errors when decimal fields (targetAmount, currentAmount, monthlyContribution) were sent as numbers instead of strings.

**Root Cause**: The database schema uses `decimal` type which expects string values in Drizzle/PostgreSQL, but the frontend was sending numeric values from form inputs.

**Solution Implemented**:
- Extended `insertGoalSchema` in `shared/schema.ts` to accept both strings and numbers with proper validation
- Strings must match decimal format regex: `/^\d+(\.\d{1,2})?$/`
- Numbers must be positive (targetAmount) or non-negative (currentAmount, monthlyContribution)
- Values are automatically transformed to strings before database storage
- Frontend components (Quick Goal Dialog and Wizard Form) convert amounts to strings explicitly for clarity

**Impact**: Both goal creation methods (Quick Goal and Wizard) now work reliably without validation errors. The schema provides backward compatibility while maintaining strict validation of decimal values.

### October 2025 - Budget App Enhancement Package (13 Features)

**Notification System**:
- Added real-time budget threshold notifications at 75% (warning) and 100% (critical) spending levels
- Implemented NotificationCenter component with severity-based visual indicators
- Notifications API endpoint provides spending context including days remaining and percentage used

**Debt Payoff Wizard Enhancement**:
- Extended budget creation wizard to 6 steps with integrated debt payoff planner (Step 3)
- Added snowball vs avalanche strategy comparison showing total interest savings
- Wizard queries existing debts and calculates optimal payoff sequence

**NLP Auto-Categorization**:
- Enhanced transaction categorization with comprehensive merchant-to-category mapping (100+ merchants)
- Implements user override memory via categoryOverrides table
- Learns from user corrections to improve future categorization accuracy

**Gamification & Streaks**:
- Created userStreaks table tracking daily budget adherence
- Implemented streak calculation logic (current, longest, total days)
- Added StreakWidget component displaying gamification metrics
- Streak API endpoints support real-time streak updates

**Infrastructure Updates**:
- Added merchant price book schema (merchantPriceBook table)
- Implemented budget goal allocations schema
- Enhanced storage layer with getUserStreak and updateUserStreak methods
- All features follow no-emoji design principle with icon-based UI

**Verified Existing Features**:
- AI insight components already integrated in budget review flows
- Toast notification system for budget creation confirmations
- Optional estimatedPrice field in budget items schema
- Month-change logic infrastructure (rollover, template reset, clone options)
- Cash-flow calendar schema components (recurring bills, predicted income)
- Safety net infrastructure (auto-transfer, overdraft prediction schemas)