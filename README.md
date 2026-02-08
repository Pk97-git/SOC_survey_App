# Facility Survey App

A cross-platform mobile application for conducting facility condition surveys with offline-first capabilities.

## 🎯 Features

### Phase 1 - Offline Survey App (100% Complete)
- ✅ Asset-centric survey workflow
- ✅ Upload asset register from Excel
- ✅ Add assets manually or during survey
- ✅ Condition rating (A-G scale)
- ✅ Photo capture with GPS
- ✅ Offline-first with SQLite
- ✅ Excel export matching template format
- ✅ Resume in-progress surveys
- ✅ Search and filter surveys

### Phase 2 - Backend & Multi-User (100% Complete)
- ✅ Node.js + Express backend API (35 endpoints)
- ✅ JWT authentication
- ✅ Multi-user roles (Admin/Surveyor/Reviewer)
- ✅ Offline sync mechanism
- ✅ Reviewer workflow (MAG/CIT/DGDA comments)
- ✅ Admin dashboard
- ✅ Docker deployment ready

## 📱 Platforms

- iOS (React Native)
- Android (React Native)
- Web (React Native Web)

## 🚀 Quick Start

### Mobile App

```bash
cd FacilitySurveyApp
npm install
npx expo start --ios    # For iOS
npx expo start --android # For Android
npx expo start --web    # For Web
```

### Backend API (Docker)

```bash
cd backend
docker-compose up -d
docker-compose exec api npm run seed
```

### Backend API (Manual)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

## 📚 Documentation

- [Walkthrough](/.gemini/antigravity/brain/59eb63c6-4415-41ad-bf0a-d5864097901c/walkthrough.md) - Complete feature documentation
- [Task Checklist](/.gemini/antigravity/brain/59eb63c6-4415-41ad-bf0a-d5864097901c/task.md) - Implementation progress
- [Deployment Guide](/backend/DEPLOYMENT.md) - Production deployment
- [Docker Guide](/backend/DOCKER.md) - Docker setup

## 🏗️ Architecture

```
├── FacilitySurveyApp/     # React Native mobile app
│   ├── src/
│   │   ├── screens/       # App screens (19 screens)
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API & data services (8 services)
│   │   ├── navigation/    # Screen navigation
│   │   └── theme/         # Styling & theming
│
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── routes/        # API endpoints (8 route files)
│   │   ├── middleware/    # Auth & validation
│   │   ├── config/        # Database config
│   │   └── scripts/       # Seed & setup scripts
│   ├── Dockerfile
│   └── docker-compose.yml
```

## 🔑 Default Credentials

After seeding the database:

- **Admin:** admin@example.com / admin123
- **Surveyor:** surveyor1@example.com / surveyor123
- **Reviewer:** mag@example.com / reviewer123

⚠️ **Change these in production!**

## 🧪 Testing

```bash
# Backend API tests
cd backend
./scripts/test-api.sh

# Mobile app
# 1. Start backend
# 2. Update API URL in src/services/api.ts
# 3. Run app and test features
```

## 📊 Project Stats

- **Total Files:** 58
- **API Endpoints:** 35
- **Mobile Screens:** 19
- **Backend Routes:** 8
- **Services:** 8

## 🛠️ Tech Stack

**Frontend:**
- React Native + Expo
- React Native Paper (UI)
- React Navigation
- SQLite (offline storage)
- XLSX (Excel export)

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT authentication
- Docker

## 📝 License

MIT

## 👥 Contributors

CIT Operations Team
