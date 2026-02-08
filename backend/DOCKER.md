# Docker Quick Start Guide

## Prerequisites

- Docker installed: https://docs.docker.com/get-docker/
- Docker Compose installed (usually comes with Docker Desktop)

---

## Quick Start

### 1. Start Everything

```bash
cd backend
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Run database schema automatically
- Start backend API server
- Set up health checks

### 2. Check Status

```bash
docker-compose ps
```

You should see:
```
NAME                    STATUS              PORTS
facility_survey_db      Up (healthy)        0.0.0.0:5432->5432/tcp
facility_survey_api     Up (healthy)        0.0.0.0:3000->3000/tcp
```

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Just API
docker-compose logs -f api

# Just database
docker-compose logs -f db
```

### 4. Seed Database

```bash
docker-compose exec api npm run seed
```

### 5. Test API

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T..."
}
```

---

## Useful Commands

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Data

```bash
docker-compose down -v
```

### Rebuild After Code Changes

```bash
docker-compose up -d --build
```

### Access Database

```bash
docker-compose exec db psql -U postgres -d facility_survey_db
```

### Run Migrations

```bash
docker-compose exec api npm run migrate
```

### Access API Container

```bash
docker-compose exec api sh
```

---

## Environment Variables

Edit `docker-compose.yml` to change:

- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret
- `PORT`: API port

For production, use `.env` file:

```bash
cp .env.example .env
# Edit .env with your values
```

Then update `docker-compose.yml`:

```yaml
api:
  env_file:
    - .env
```

---

## Production Deployment

### Build Production Image

```bash
docker build -t facility-survey-api:latest .
```

### Push to Registry

```bash
# Docker Hub
docker tag facility-survey-api:latest your-username/facility-survey-api:latest
docker push your-username/facility-survey-api:latest

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker tag facility-survey-api:latest your-account.dkr.ecr.us-east-1.amazonaws.com/facility-survey-api:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/facility-survey-api:latest
```

### Deploy to Cloud

**AWS ECS / Fargate:**
- Use the pushed ECR image
- Set environment variables
- Configure load balancer

**Google Cloud Run:**
```bash
gcloud run deploy facility-survey-api \
  --image your-account.dkr.ecr.us-east-1.amazonaws.com/facility-survey-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Azure Container Instances:**
```bash
az container create \
  --resource-group myResourceGroup \
  --name facility-survey-api \
  --image your-username/facility-survey-api:latest \
  --dns-name-label facility-survey \
  --ports 3000
```

---

## Troubleshooting

### Database Connection Failed

```bash
# Check if database is healthy
docker-compose ps

# Restart database
docker-compose restart db

# Check logs
docker-compose logs db
```

### API Not Starting

```bash
# Check logs
docker-compose logs api

# Rebuild
docker-compose up -d --build api
```

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

---

## Development Workflow

### 1. Make Code Changes

Edit files in `src/`

### 2. Rebuild

```bash
docker-compose up -d --build api
```

### 3. Test

```bash
curl http://localhost:3000/api/your-endpoint
```

### 4. Check Logs

```bash
docker-compose logs -f api
```

---

## Backup & Restore

### Backup Database

```bash
docker-compose exec db pg_dump -U postgres facility_survey_db > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T db psql -U postgres facility_survey_db
```

---

## Monitoring

### Health Checks

Docker automatically monitors health:

```bash
docker-compose ps
```

Healthy services show `Up (healthy)`

### Resource Usage

```bash
docker stats
```

Shows CPU, memory, network usage

---

## Clean Up

### Remove All Containers

```bash
docker-compose down
```

### Remove All Data

```bash
docker-compose down -v
```

### Remove Images

```bash
docker rmi facility-survey-api
docker rmi postgres:14-alpine
```

---

## Next Steps

1. ✅ Start services: `docker-compose up -d`
2. ✅ Seed database: `docker-compose exec api npm run seed`
3. ✅ Test API: `curl http://localhost:3000/health`
4. ✅ Update mobile app to point to `http://localhost:3000/api`
5. ✅ Start developing!
