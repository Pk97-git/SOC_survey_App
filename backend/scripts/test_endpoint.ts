
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoint() {
    try {
        console.log('Testing endpoint availability...');

        // 1. Health Check
        try {
            const health = await axios.get('http://localhost:3000/health');
            console.log('✅ Health Check:', health.status, health.data);
        } catch (e: any) {
            console.error('❌ Health Check Failed:', e.message);
            return;
        }

        // 2. Login to get token (assuming standard admin creds or we need to skip auth for test??)
        // We can't easily skip auth without modifying code. 
        // Let's try to hit the route without auth first -> Should be 401, NOT 404.
        try {
            console.log('Testing POST /api/assets/import-excel (No Auth)...');
            await axios.post(`${BASE_URL}/assets/import-excel`);
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                console.log('✅ Route exists (protected): Got 401 Unauthorized as expected.');
            } else if (e.response && e.response.status === 404) {
                console.error('❌ Route NOT FOUND: Got 404.');
            } else {
                console.log('❓ Unexpected status:', e.response?.status, e.message);
            }
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

testEndpoint();
