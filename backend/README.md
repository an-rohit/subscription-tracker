# Subscription Tracker - Backend

This is the backend REST API for the Subscription Tracker application. It provides authentication, subscription management, analytics processing, a custom PostgreSQL trigger for payment history, and AI-powered subscription parsing.

## Tech Stack

- **Environment**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL / Supabase
- **ORM**: Prisma
- **Authentication**: JWT & bcryptjs
- **Google API**: OAuth 2.0 (Gmail readonly scope for invoice scanning)

## Scripts

- `npm run dev`: Starts the development server using `nodemon`.
- `npm start`: Starts the production server.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment variables. Create a `.env` file based on `.env.example` and provide:
   - `DATABASE_URL` and `DIRECT_URL` for your PostgreSQL connection.
   - `JWT_SECRET` and `SESSION_SECRET` for securing sessions and tokens.
   - `OPENROUTER_API_KEY` for AI features.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google OAuth and Gmail integration.
3. Push the Prisma schema to your database to create the necessary tables:
   ```bash
   npx prisma db push
   ```
4. **Important**: Run the DBMS trigger SQL to automate payment history generation:
   Execute `prisma/sql/create_payment_history_trigger.sql` in your database via Supabase SQL Editor or your preferred PostgreSQL client.
5. Start the development server:
   ```bash
   npm run dev
   ```

## API Structure

- `src/controllers`: Request handlers for authentication, subscriptions, analytics, and AI routes.
- `src/routes`: Express route definitions.
- `src/middleware`: Custom middlewares (e.g., Auth verification).
- `src/services`: Business logic (e.g., AI parsing service).
- `prisma`: Database schema and SQL scripts (including the trigger).
