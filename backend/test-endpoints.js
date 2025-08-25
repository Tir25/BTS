#!/usr/bin/env node

/**
 * Simple endpoint test script
 */

const https = require('https');

const BACKEND_URL = 'https://bus-tracking-backend-1u04.onrender.com';

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${path}`;
    console.log(`Testing: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${path}: ${res.statusCode}`);
        if (res.statusCode !== 404) {
          console.log(`   Response: ${data.substring(0, 200)}...`);
        }
        resolve({ statusCode: res.statusCode, data });
      });
    }).on('error', (err) => {
      console.log(`❌ ${path}: ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  console.log('🔍 Testing backend endpoints...\n');
  
  const endpoints = [
    '/',
    '/health',
    '/admin/health',
    '/admin/analytics',
    '/buses',
    '/routes'
  ];
  
  for (const endpoint of endpoints) {
    try {
      await testEndpoint(endpoint);
    } catch (error) {
      console.log(`Failed to test ${endpoint}`);
    }
    console.log('');
  }
  
  console.log('📊 Endpoint testing complete');
}

main().catch(console.error);
