# Production Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed
- Domain name (optional)
- SSL certificate (for HTTPS)

---

## Option 1: Deploy to Heroku

### 1. Install Heroku CLI

```bash
brew install heroku/brew/heroku  # macOS
# or
curl https://cli-assets.heroku.com/install.sh | sh  # Linux
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
cd backend
heroku create facility-survey-api
```

### 4. Add PostgreSQL Add-on

```bash
heroku addons:create heroku-postgresql:mini
```

### 5. Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_super_secret_jwt_key_change_this
heroku config:set JWT_EXPIRES_IN=1h
heroku config:set PORT=3000
```

### 6. Deploy

```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 7. Run Database Schema

```bash
heroku pg:psql < schema.sql
```

### 8. Check Logs

```bash
heroku logs --tail
```

Your API will be available at: `https://facility-survey-api.herokuapp.com`

---

## Option 2: Deploy to AWS EC2

### 1. Launch EC2 Instance

- AMI: Ubuntu 22.04 LTS
- Instance Type: t2.micro (free tier)
- Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (API)

### 2. SSH into Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 4. Set Up PostgreSQL

```bash
sudo -u postgres psql

CREATE DATABASE facility_survey_db;
CREATE USER facility_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE facility_survey_db TO facility_user;
\q
```

### 5. Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/your-repo/facility-survey-backend.git
cd facility-survey-backend
```

### 6. Install Dependencies

```bash
npm install
npm run build
```

### 7. Create .env File

```bash
sudo nano .env
```

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=facility_survey_db
DB_USER=facility_user
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1h
```

### 8. Run Database Schema

```bash
psql -h localhost -U facility_user -d facility_survey_db -f schema.sql
```

### 9. Start with PM2

```bash
pm2 start dist/server.js --name facility-api
pm2 save
pm2 startup
```

### 10. Set Up Nginx (Optional)

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/facility-api
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/facility-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 11. Set Up SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Your API will be available at: `https://your-domain.com`

---

## Option 3: Deploy to DigitalOcean App Platform

### 1. Create DigitalOcean Account

Sign up at https://www.digitalocean.com

### 2. Create New App

- Connect your GitHub repository
- Select branch: `main`
- Detect: Node.js

### 3. Add Database

- Add PostgreSQL database (Dev or Prod)
- Note the connection string

### 4. Set Environment Variables

```
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1h
DATABASE_URL=${db.DATABASE_URL}
```

### 5. Deploy

Click "Deploy" and wait for build to complete.

### 6. Run Database Schema

Use DigitalOcean console or connect via psql:

```bash
psql $DATABASE_URL < schema.sql
```

---

## Post-Deployment

### 1. Test API

```bash
curl https://your-api-url/health
```

### 2. Create Admin User

```bash
curl -X POST https://your-api-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "secure_password",
    "fullName": "Admin User",
    "role": "admin"
  }'
```

### 3. Update Mobile App

Edit `src/services/api.ts`:

```typescript
const baseURL = 'https://your-api-url/api';
```

### 4. Monitor Logs

**Heroku:**
```bash
heroku logs --tail
```

**AWS EC2:**
```bash
pm2 logs facility-api
```

**DigitalOcean:**
Use the web console

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring/alerts
- [ ] Use environment variables (never commit secrets)
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Keep dependencies updated

---

## Backup & Recovery

### Backup Database

```bash
# Heroku
heroku pg:backups:capture
heroku pg:backups:download

# PostgreSQL
pg_dump -h localhost -U facility_user facility_survey_db > backup.sql
```

### Restore Database

```bash
# Heroku
heroku pg:backups:restore 'https://your-backup-url' DATABASE_URL

# PostgreSQL
psql -h localhost -U facility_user facility_survey_db < backup.sql
```

---

## Troubleshooting

### Database Connection Failed

- Check PostgreSQL is running
- Verify credentials in .env
- Check firewall rules
- Test connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`

### API Not Responding

- Check server logs
- Verify port is open
- Check PM2 status: `pm2 status`
- Restart: `pm2 restart facility-api`

### CORS Errors

Update `src/server.ts`:

```typescript
app.use(cors({
  origin: ['https://your-frontend-url.com'],
  credentials: true
}));
```

---

## Monitoring

### Set Up Uptime Monitoring

- UptimeRobot (free): https://uptimerobot.com
- Pingdom
- StatusCake

### Application Monitoring

- Sentry (error tracking)
- New Relic (APM)
- Datadog

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
      working-directory: ./backend
    
    - name: Run tests
      run: npm test
      working-directory: ./backend
    
    - name: Build
      run: npm run build
      working-directory: ./backend
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "facility-survey-api"
        heroku_email: "your-email@example.com"
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@yourcompany.com
