# Subscription Tracker - Frontend

This is the frontend for the Subscription Tracker application. It is built with React, Vite, and features a responsive design with animations, dark mode, and charting capabilities.

## Tech Stack

- **Framework**: React 19 + Vite
- **Routing**: React Router DOM
- **Animations**: Framer Motion
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the app for production.
- `npm run lint`: Runs ESLint to check for code quality.
- `npm run preview`: Previews the production build locally.

## Setup

1. Make sure you have the backend running.
2. If your backend is running on a port other than `5000`, create a `.env` file based on `.env.example` and set `VITE_API_URL` accordingly.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Structure

- `src/components`: Reusable UI components like the Navbar.
- `src/pages`: Main application pages (Dashboard, Analytics, Subscriptions, Renewal Timeline, etc.).
- `src/context`: Global state management via React Context (AuthContext, ThemeContext).
- `src/services`: API service wrappers (Axios).
