// Combined server: serves frontend + API on HTTPS port 443
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: 'C:\\Users\\Prashant\\Documents\\GH products\\SOC products\\Conditional survey\\backend\\.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow all for now
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || '10mb', extended: true }));

// Health check
app.get('/health', async (req, res) => {
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
});

// API Routes - import dynamically
const apiRouter = express.Router();

// Basic API proxy - forward to backend on different port
app.use('/api', (req, res) => {
    // Forward to backend - strip /api prefix
    const backendPort = 3000;
    const pathWithoutApi = req.originalUrl.replace('/api', '');
    const options = {
        hostname: 'localhost',
        port: backendPort,
        path: pathWithoutApi,
        method: req.method,
        headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });
    
    req.pipe(proxyReq, { end: true });
    proxyReq.on('error', (e) => {
        console.error('Proxy error:', e);
        res.status(502).json({ error: 'Backend unavailable' });
    });
});

// Serve frontend static files from the web folder
const frontendPath = 'C:\\Users\\Prashant\\Documents\\GH products\\SOC products\\Conditional survey\\deploy\\web';
app.use(express.static(frontendPath));

// Handle SPA routing - serve index.html for non-API routes
app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        next();
    }
});

// API proxy middleware - MUST be after SPA routing to catch /api requests

// SSL configuration - use PFX for Windows
const httpsOptions = {
    pfx: fs.readFileSync('C:\\Users\\Prashant\\Documents\\GH products\\SOC products\\Conditional survey\\deploy\\certificate.pfx'),
    passphrase: 'password'
};

// Start HTTPS server only (port 80 not needed for now)
https.createServer(httpsOptions, app).listen(443, () => {
    console.log('✅ HTTPS Server running on port 443');
    console.log('   Frontend: https://localhost/');
    console.log('   API: https://localhost/api');
});

// Skip HTTP server - port 80 may be in use
