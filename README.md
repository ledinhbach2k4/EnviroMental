<p align="center">
  <img width="200" alt="EnviroMental App Logo" src="mobile/assets/images/icon.png" />
</p>

<h1 align="center">🌱 EnviroMental App</h1>

<p align="center">
  <i>Track how your environment affects your mental well-being.</i>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-green.svg" alt="MIT License" /></a>
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-%5E49.0.0-blue?logo=expo" alt="Expo" /></a>
</p>

---

## 🧠 About the Project

**EnviroMental** is a cross-platform mobile app designed to help users understand how environmental factors (such as location, weather, and pollution) impact their mental health.

Built with **React Native (Expo)** on the frontend and **Node.js + Express** on the backend, the app combines geolocation, mood tracking, and environmental data to provide personalized insights and trends over time.

---

## ✨ Features

- 📍 Tracks your location and current environmental data (weather, air quality, etc.)
- 🧠 Mood journaling and emotional reflection
- 📊 Analytics to correlate environment and mental states
- 🔐 Secure authentication using Clerk
- 🔁 Scheduled tasks and background jobs
- ☁️ PostgreSQL database with Drizzle ORM
- 📱 Mobile app built with Expo (iOS, Android)

---

## 📂 Project Structure

```

.
├── backend/                  # API server (Node.js + Express + Drizzle ORM)
│   ├── src/                  # Backend source code
│   ├── drizzle.config.js     # Drizzle configuration
│   ├── package.json          # Backend dependencies
│   └── ...
├── frontend/ (environmental) # Mobile app (React Native + Expo Router)
│   ├── app/                  # Screens and routing
│   ├── assets/               # Images, icons, fonts
│   ├── package.json          # Frontend dependencies
│   └── ...
├── README.md
└── ...

````

---

## 🚀 Technologies Used

### Frontend (Mobile App)
- **React Native (Expo)**
- **Expo Router** for navigation
- **Clerk** for authentication
- **Axios** for HTTP requests
- Device APIs: `expo-location`, `expo-secure-store`, `expo-linear-gradient`, etc.

### Backend (API Server)
- **Node.js + Express**
- **Drizzle ORM** + **PostgreSQL**
- **dotenv** for environment variables
- **Clerk SDK (Node)** for server-side auth
- **cron** for scheduled background tasks

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://your-db-url
CLERK_SECRET_KEY=your-clerk-secret
PORT=4000
````

### Frontend (`frontend/.env`)

```env
API_URL=http://localhost:4000
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

> You can copy from `.env.example` in each folder and adjust the values accordingly.

---

## 🔧 Installation & Setup

### 1️⃣ Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Add DB connection, Clerk secret, etc.
npm run dev           # Start development server
```

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env  # Add backend API URL and Clerk keys
npm run start         # Launch Expo Dev Tools
```

---

## 📌 Useful Scripts

### Backend

* `npm run dev` — Start dev server with nodemon
* `npm start` — Start production server
* `npm run test` — Run tests using Vitest

### Frontend

* `npm run start` — Launch Expo dev tools
* `npm run android` — Run app on Android device/emulator
* `npm run ios` — Run app on iOS simulator
* `npm run web` — Run app in browser

---

## 🧪 Running Tests

### Backend

```bash
cd backend
npm run test
```

> Tests are powered by [Vitest](https://vitest.dev) and cover key routes and logic.

---

## 🌐 API & Database

* **Database:** PostgreSQL (hosted on [Neon](https://neon.tech) or similar)
* **ORM:** Drizzle ORM
* **Authentication:** Clerk (Frontend & Backend)

---

## 🚀 Deployment

### Backend (Render / Railway / Vercel)

* Set environment variables from `.env`.
* Deploy from the `backend/` directory.
* Ensure DB access and authentication keys are set.

### Frontend (Expo)

* Use `eas build` to build for production.
* Use `eas update` for OTA updates.
* Configure `CLERK_PUBLISHABLE_KEY` in `.env`.

---

## 🤝 Contributing

We welcome contributions from developers, designers, and researchers.

### How to Contribute

* ⭐ Star the repo
* 🐛 Report issues or bugs
* 🔧 Suggest new features
* 📦 Submit pull requests

---

## ☕ Sponsor

Like what I'm building? A ⭐ on the repo is already appreciated.

If you'd like to support me and help keep my little projects going, you can **[buy me a coffee](https://buymeacoffee.com/bachle8404)**. ☕

Every coffee helps me keep experimenting, learning, and building more stuff.

**Thanks for the support! 🫶**


## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">🌿 Made with care for mind and environment 🌍</p>

