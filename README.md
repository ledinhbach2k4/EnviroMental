```markdown
# 🌱 EnviroMental App

The **EnviroMental** app helps track the environmental impact on mental health, using **React Native (Expo)** for the frontend and **Node.js + Express** for the backend, combined with **PostgreSQL** and **Drizzle ORM** for the database.

## 📂 Project Structure

```

.
├── backend/                 # API server (Node.js + Express + Drizzle ORM)
│   ├── src/                 # Backend source code
│   ├── drizzle.config.js    # Drizzle configuration
│   ├── package.json         # Backend dependencies
│   └── ...
├── frontend/ (environmental) # Mobile application (React Native + Expo Router)
│   ├── app/                 # Screens and routing
│   ├── assets/              # Images, icons, fonts
│   ├── package.json         # Frontend dependencies
│   └── ...
├── README.md
└── ...

````

## 🚀 Technologies Used

### Frontend (Mobile App)
- **React Native** (Expo)
- **Expo Router** for navigation
- **Clerk** for user authentication
- **Axios** for API calls
- Device APIs: `expo-location`, `expo-secure-store`, `expo-linear-gradient`, etc.

### Backend (API Server)
- **Node.js + Express**
- **Drizzle ORM** + **PostgreSQL**
- **dotenv** for environment variable management
- **Clerk SDK Node** for authentication
- **Cron** for scheduled tasks

## ⚙️ Installation

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env   # Create an environment file and set up DB, API keys, etc.
npm run dev            # Start server in development mode
````

### 2. Frontend

```bash
cd environmental
npm install
cp .env.example .env   # Add backend API URL and required keys
npm run start          # Launch Expo Dev Tools
```

## 📌 Useful Scripts

### Backend

* `npm run dev` — Run the server with nodemon
* `npm start` — Run the server in production
* `npm run test` — Run tests with Vitest

### Frontend

* `npm run start` — Start the Expo app
* `npm run android` — Run the app on Android emulator/device
* `npm run ios` — Run the app on iOS simulator
* `npm run web` — Run the app in the browser

## 🌐 API & Database

* **Database:** PostgreSQL (Neon Serverless)
* **ORM:** Drizzle ORM
* **Authentication:** Clerk

