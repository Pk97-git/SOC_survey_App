# Facility Survey App - Azure Deployment Plan
## For Senior PM Review

**Date:** March 2026  
**Prepared by:** Prashant Kumar  
**Server:** Azure Windows VM (Remote Desktop)

---

## 1. Application Overview

### What is this?
A **Facility Condition Survey Application** that allows surveyors to inspect building assets (HVAC, electrical, plumbing, etc.) and record their condition ratings.

### Architecture
```
Android Mobile App (APK)  <--->  Azure VM Backend  <--->  PostgreSQL Database
                                    (Node.js API)
```

### Components
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Mobile App** | React Native (Expo) | Android APK for surveyors |
| **Backend API** | Node.js + Express + TypeScript | REST API (47 endpoints) |
| **Database** | PostgreSQL 18 | Data storage (installed on same VM) |
| **Process Manager** | PM2 | Keep Node.js running as service |
| **Reverse Proxy** | IIS | Security + SSL termination |

---

## 2. Current State - What's Already Installed

On the Azure Windows VM, the following are **already installed**:

| Software | Version | Status | Purpose |
|----------|---------|--------|---------|
| PostgreSQL | 18 | ✅ Installed | Database server |
| psql CLI | 18 | ✅ Available | Database management |
| Node.js | (need to verify) | ⚠️ To check | Backend runtime |
| IIS | (need to verify) | ⚠️ To check | Reverse proxy |

### Database Status
- PostgreSQL running on **port 5433** (custom port)
- Database `facility_survey` created (to be verified)
- Schema needs to be applied from `backend/schema.sql`

---

## 3. Proposed Deployment Architecture

### Recommended: IIS Reverse Proxy + PM2 + Static IP

```
Internet (Port 443/80)
         |
         v
+-----------------------------+
|  Azure VM - Windows Server  |
|                             |
|  +---------------------+    |
|  | IIS Reverse Proxy   |    |  <-- Port 443 (HTTPS)
|  | URL Rewrite + ARR   |    |
|  +----------+----------+    |
|             |               |
|             v               |
|  +---------------------+    |
|  | Node.js + Express   |    |  <-- Port 3000 (internal only)
|  | (PM2 Process Mgr)   |    |
|  +----------+----------+    |
|             |               |
|             v               |
|  +---------------------+    |
|  | PostgreSQL          |    |  <-- Port 5433 (localhost only)
|  +---------------------+    |
+-----------------------------+
```

### Why This Architecture?

| Component | Why It's Needed |
|-----------|-----------------|
| **IIS Reverse Proxy** | Security layer - Node.js not directly exposed to internet; handles SSL; Windows native |
| **PM2** | Process manager - auto-restart on crashes; logs management; clustering support |
| **Static IP** | Android APK needs consistent endpoint; Azure Dynamic IP changes on reboot |
| **Port 443/80** | Standard HTTP/HTTPS ports; firewall-friendly; mobile networks allow these |

---

## 4. Security Considerations

### What's Good
| Security Feature | Implementation |
|------------------|----------------|
| JWT Authentication | Tokens with configurable expiration |
| Password Hashing | bcrypt with 10 salt rounds |
| Role-Based Access | Admin / Surveyor / Reviewer roles |
| Rate Limiting | 1000 req/15min in production |
| CORS Whitelist | Configurable allowed origins |
| SQL Injection Protection | Parameterized queries throughout |

### What Needs Attention
| Concern | Recommendation |
|---------|----------------|
| JWT Secret | Must be 32+ characters, random, not in source control |
| Database Password | Use strong password, not default |
| SSL Certificate | Required for production (HTTPS) |
| Firewall Rules | Only open 443 (HTTPS) to internet |
| Static IP | Required for mobile app to connect consistently |

---

## 5. Azure Configuration Required

### Step 1: Static Public IP
**Action Required:** Change VM's Public IP from Dynamic to Static
- **Azure Portal** → Virtual Machine → Networking → Public IP
- Change assignment from **Dynamic** to **Static**
- **Cost:** ~$3-5/month for static IP

### Step 2: Network Security Group (NSG)
**Action Required:** Open inbound ports

| Priority | Port | Protocol | Source | Action | Purpose |
|----------|------|----------|--------|--------|---------|
| 100 | 443 | TCP | Any | Allow | HTTPS (secure) |
| 110 | 80 | TCP | Any | Allow | HTTP (redirect to HTTPS) |
| 4096 | * | * | Any | Deny | Default deny |

**Note:** Port 3000 (Node.js) and 5433 (PostgreSQL) remain **internal only** - not exposed to internet.

### Step 3: Windows Firewall (if enabled)
Allow IIS (World Wide Web Services) through Windows Firewall.

---

## 6. Software Installation Plan

### On Azure VM - Required Installations

| Software | Download/Command | Purpose |
|----------|------------------|---------|
| Node.js 18 LTS | https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi | Backend runtime |
| PM2 | `npm install -g pm2` | Process manager |
| IIS URL Rewrite | https://www.iis.net/downloads/microsoft/url-rewrite | Reverse proxy rules |
| IIS ARR | https://www.iis.net/downloads/microsoft/application-request-routing | Application routing |

### Configuration Files Needed

**1. Backend Environment File (`.env`)**
```
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=facility_survey
DB_USER=postgres
DB_PASSWORD=[STRONG_PASSWORD]
JWT_SECRET=[32+CHAR_RANDOM_STRING]
JWT_EXPIRES_IN=24h
ALLOWED_ORIGINS=https://[AZURE_STATIC_IP],http://localhost:8081
```

**2. IIS web.config (URL Rewrite)**
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule1" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 7. Deployment Steps (Summary)

### Phase 1: Azure Infrastructure (Requires Admin Access)
1. Change Public IP to Static in Azure Portal
2. Configure NSG to allow port 443
3. Document the Static IP address

### Phase 2: Windows Server Setup
1. Install Node.js 18 LTS
2. Install IIS with URL Rewrite and ARR modules
3. Install PM2 globally: `npm install -g pm2`

### Phase 3: Backend Deployment
1. Copy project to `C:\apps\facility-survey\`
2. Create `.env` file with production settings
3. Run `npm install` and `npm run build`
4. Apply database schema: `psql -U postgres -d facility_survey -f schema.sql`
5. Seed database: `node dist/scripts/seed.js`
6. Start with PM2: `pm2 start dist/server.js --name facility-api`
7. Save PM2 config: `pm2 startup` and `pm2 save`

### Phase 4: IIS Configuration
1. Configure reverse proxy to forward to localhost:3000
2. Test health endpoint: `http://localhost/health`
3. Configure SSL certificate (if available)

### Phase 5: Mobile App Update
1. Update API URL in mobile app config to Azure Static IP
2. Rebuild APK
3. Distribute to surveyors

---

## 8. Post-Deployment Verification

### API Health Check
```bash
curl http://[AZURE_STATIC_IP]/health
# Expected: { status: "ok", timestamp: "..." }
```

### Authentication Test
```bash
curl -X POST http://[AZURE_STATIC_IP]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Mobile App Connectivity
- Install APK on Android device
- Login with admin credentials
- Verify sync functionality works

---

## 9. Maintenance & Monitoring

### PM2 Commands (Process Management)
```bash
pm2 status              # Check if API is running
pm2 logs facility-api   # View application logs
pm2 restart facility-api # Restart after code changes
pm2 monit               # Real-time monitoring
```

### Log Locations
| Log Type | Location |
|----------|----------|
| PM2 Logs | `C:\Users\[User]\.pm2\logs\` |
| IIS Logs | `C:\inetpub\logs\LogFiles\` |
| PostgreSQL | `C:\Program Files\PostgreSQL\18\data\log\` |

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| IP Address Changes | High (if dynamic) | High | Assign Static IP |
| Server Downtime | Medium | High | PM2 auto-restart; monitor with Azure Alerts |
| Database Failure | Low | Critical | Regular backups; PostgreSQL has built-in recovery |
| Security Breach | Low | High | IIS reverse proxy; firewall rules; strong passwords |
| SSL Certificate Expiry | Low | Medium | Set reminders; use Let's Encrypt auto-renewal |

---

## 11. Approval Checklist for Senior PM

Before proceeding, please confirm:

- [ ] **Budget approved** for Azure Static IP (~$3-5/month)
- [ ] **Security review** completed for opening port 443
- [ ] **SSL Certificate** - Purchase commercial or use Let's Encrypt?
- [ ] **Backup strategy** - Who will manage PostgreSQL backups?
- [ ] **Access control** - Who has Azure admin access for configuration?
- [ ] **Mobile app distribution** - How will APK be distributed to surveyors?

---

## 12. Questions for PM

1. **SSL Certificate:** Should we purchase a commercial SSL certificate or use free Let's Encrypt?
2. **Domain Name:** Do we have a domain to use (e.g., survey.company.com) or use IP address?
3. **Backup Schedule:** How often should database backups be taken?
4. **Monitoring:** Should we set up Azure monitoring alerts for server downtime?
5. **User Accounts:** Should we change the default admin password before deployment?

---

## Next Steps

Awaiting approval from Senior PM to proceed with:
1. Azure Static IP configuration
2. IIS and Node.js installation
3. Production deployment

---

**Document Version:** 1.0  
**Last Updated:** March 2026
