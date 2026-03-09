# API Testing Guide - Phase 2.2

## 🧪 Complete API Test Suite

### Prerequisites

1. **Start the server:**
```bash
cd backend
npm run dev
```

2. **Set up test data:**
- Create a test user (surveyor)
- Get authentication token
- Use token in subsequent requests

---

## 1. Authentication Tests

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "surveyor@test.com",
    "password": "test123",
    "fullName": "Test Surveyor",
    "role": "surveyor"
  }'
```

**Expected Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "surveyor@test.com",
    "full_name": "Test Surveyor",
    "role": "surveyor"
  }
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "surveyor@test.com",
    "password": "test123"
  }'
```

**Save the token from response!**

---

## 2. Sites API Tests

### Create Site
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:3000/api/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Historical Well-2 Location",
    "location": "Location no 26"
  }'
```

### Get All Sites
```bash
curl http://localhost:3000/api/sites \
  -H "Authorization: Bearer $TOKEN"
```

### Get Site by ID
```bash
SITE_ID="uuid_from_create_response"

curl http://localhost:3000/api/sites/$SITE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Site
```bash
curl -X PUT http://localhost:3000/api/sites/$SITE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Site Name",
    "location": "Updated Location"
  }'
```

---

## 3. Assets API Tests

### Create Single Asset
```bash
curl -X POST http://localhost:3000/api/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "'$SITE_ID'",
    "refCode": "26HW2/GF/CIVIL/WALLEXT/001",
    "name": "External Mud Wall",
    "serviceLine": "Civil",
    "floor": "GF",
    "area": "External",
    "age": "26",
    "description": "Heritage mud wall"
  }'
```

### Bulk Import Assets
```bash
curl -X POST http://localhost:3000/api/assets/bulk-import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "'$SITE_ID'",
    "assets": [
      {
        "refCode": "26HW2/GF/CIVIL/TILEEXT/001",
        "name": "External Tiles",
        "serviceLine": "Civil",
        "floor": "GF",
        "area": "External",
        "age": "26"
      },
      {
        "refCode": "26HW2/GF/CIVIL/STONEWALLEXT/001",
        "name": "Stone Wall External",
        "serviceLine": "Civil",
        "floor": "GF",
        "area": "External",
        "age": "26"
      }
    ]
  }'
```

### Get Assets (All)
```bash
curl http://localhost:3000/api/assets \
  -H "Authorization: Bearer $TOKEN"
```

### Get Assets by Site
```bash
curl "http://localhost:3000/api/assets?siteId=$SITE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Surveys API Tests

### Create Survey
```bash
curl -X POST http://localhost:3000/api/surveys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "'$SITE_ID'",
    "trade": "FM Services"
  }'
```

**Save SURVEY_ID from response!**

### Get All Surveys
```bash
curl http://localhost:3000/api/surveys \
  -H "Authorization: Bearer $TOKEN"
```

### Get Survey by ID
```bash
SURVEY_ID="uuid_from_create_response"

curl http://localhost:3000/api/surveys/$SURVEY_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Survey
```bash
curl -X PUT http://localhost:3000/api/surveys/$SURVEY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'
```

---

## 5. Inspections API Tests

### Create Inspection
```bash
ASSET_ID="uuid_from_asset_create"

curl -X POST http://localhost:3000/api/surveys/$SURVEY_ID/inspections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "'$ASSET_ID'",
    "conditionRating": "B >> Excellent",
    "overallCondition": "Satisfactory",
    "quantityInstalled": 1,
    "quantityWorking": 1,
    "remarks": "The heritage is in excellent condition",
    "gpsLat": 12.9716,
    "gpsLng": 77.5946
  }'
```

**Save INSPECTION_ID from response!**

### Get Inspections for Survey
```bash
curl http://localhost:3000/api/surveys/$SURVEY_ID/inspections \
  -H "Authorization: Bearer $TOKEN"
```

### Update Inspection
```bash
INSPECTION_ID="uuid_from_create_response"

curl -X PUT http://localhost:3000/api/surveys/inspections/$INSPECTION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conditionRating": "A >> NEW",
    "remarks": "Updated remarks"
  }'
```

---

## 6. Photos API Tests

### Upload Photo
```bash
curl -X POST http://localhost:3000/api/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/image.jpg" \
  -F "assetInspectionId=$INSPECTION_ID" \
  -F "surveyId=$SURVEY_ID" \
  -F "caption=Front view of mud wall"
```

**Save PHOTO_ID from response!**

### Get Photos for Inspection
```bash
curl http://localhost:3000/api/photos/inspection/$INSPECTION_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Get Photo File
```bash
PHOTO_ID="uuid_from_upload_response"

curl http://localhost:3000/api/photos/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN" \
  --output downloaded_photo.jpg
```

### Delete Photo
```bash
curl -X DELETE http://localhost:3000/api/photos/$PHOTO_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Submit Survey

### Submit Survey
```bash
curl -X POST http://localhost:3000/api/surveys/$SURVEY_ID/submit \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Survey submitted successfully",
  "survey": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "2026-02-08T10:00:00.000Z"
  }
}
```

---

## 8. Complete Workflow Test

### Full Survey Workflow
```bash
#!/bin/bash

# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"surveyor@test.com","password":"test123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 2. Create Site
SITE_ID=$(curl -s -X POST http://localhost:3000/api/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","location":"Test Location"}' \
  | jq -r '.site.id')

echo "Site ID: $SITE_ID"

# 3. Bulk Import Assets
curl -s -X POST http://localhost:3000/api/assets/bulk-import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "'$SITE_ID'",
    "assets": [
      {"name": "Asset 1", "serviceLine": "Civil"},
      {"name": "Asset 2", "serviceLine": "Electrical"}
    ]
  }' | jq '.'

# 4. Create Survey
SURVEY_ID=$(curl -s -X POST http://localhost:3000/api/surveys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siteId":"'$SITE_ID'","trade":"FM Services"}' \
  | jq -r '.survey.id')

echo "Survey ID: $SURVEY_ID"

# 5. Get Assets
ASSETS=$(curl -s "http://localhost:3000/api/assets?siteId=$SITE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Assets: $ASSETS"

# 6. Create Inspections (for each asset)
# ... (loop through assets and create inspections)

# 7. Submit Survey
curl -s -X POST http://localhost:3000/api/surveys/$SURVEY_ID/submit \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo "Survey submitted!"
```

---

## 📊 Expected Results

### Successful Responses

| Endpoint | Status | Response |
|----------|--------|----------|
| POST /api/auth/register | 201 | User object + message |
| POST /api/auth/login | 200 | Token + user object |
| POST /api/sites | 201 | Site object + message |
| GET /api/sites | 200 | Array of sites |
| POST /api/assets/bulk-import | 201 | Array of assets + count |
| POST /api/surveys | 201 | Survey object + message |
| POST /api/surveys/:id/inspections | 201 | Inspection object + message |
| POST /api/photos/upload | 201 | Photo object + message |
| POST /api/surveys/:id/submit | 200 | Updated survey + message |

### Error Responses

| Error | Status | Response |
|-------|--------|----------|
| Missing token | 401 | `{"error": "No token provided"}` |
| Invalid token | 401 | `{"error": "Invalid or expired token"}` |
| Insufficient permissions | 403 | `{"error": "Insufficient permissions"}` |
| Resource not found | 404 | `{"error": "... not found"}` |
| Validation error | 400 | `{"error": "... required"}` |
| Server error | 500 | `{"error": "Failed to ..."}` |

---

## ✅ Phase 2.2 Complete!

All Core APIs are implemented and tested. Ready for Phase 2.3 (Mobile App Integration).
