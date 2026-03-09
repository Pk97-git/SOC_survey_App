# Facility Survey Backend API

Backend API for the Facility Survey mobile application.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Language:** TypeScript

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Set Up Database
```bash
# Create database
createdb facility_survey_db

# Run schema
psql -U postgres -d facility_survey_db -f schema.sql
```

### 4. Run Development Server
```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users (Admin only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Sites (Coming in Phase 2.2)
- `GET /api/sites` - List sites
- `POST /api/sites` - Create site

### Assets (Coming in Phase 2.2)
- `GET /api/assets` - List assets
- `POST /api/assets` - Create asset

### Surveys (Coming in Phase 2.2)
- `GET /api/surveys` - List surveys
- `POST /api/surveys` - Create survey

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts       # Database connection
│   ├── middleware/
│   │   └── auth.middleware.ts # JWT auth & authorization
│   ├── routes/
│   │   ├── auth.routes.ts    # Authentication routes
│   │   ├── user.routes.ts    # User management
│   │   ├── site.routes.ts    # Sites (placeholder)
│   │   ├── asset.routes.ts   # Assets (placeholder)
│   │   └── survey.routes.ts  # Surveys (placeholder)
│   └── server.ts             # Express app setup
├── schema.sql                # Database schema
├── .env.example              # Environment template
└── package.json
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Testing

Use tools like Postman or curl to test endpoints:

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User","role":"surveyor"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Next Steps (Phase 2.2)

- Implement Sites API
- Implement Assets API
- Implement Surveys API
- Add photo upload
- Implement sync mechanism
