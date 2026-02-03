#!/usr/bin/env node

const https = require('https');

// Configuration
const FORGE_API_BASE = 'forge.laravel.com';
const POLL_INTERVAL = 10000; // 10 seconds
const TIMEOUT = 600000; // 10 minutes

// Environment variables
const FORGE_API_TOKEN = process.env.FORGE_API_TOKEN;
const FORGE_ORGANIZATION = process.env.FORGE_ORGANIZATION;
const FORGE_SERVER_ID = process.env.FORGE_SERVER_ID;
const FORGE_SITE_ID = process.env.FORGE_SITE_ID;

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = {
    FORGE_API_TOKEN,
    FORGE_ORGANIZATION,
    FORGE_SERVER_ID,
    FORGE_SITE_ID
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }

  console.log('✓ Environment variables validated');
}

/**
 * Make an authenticated HTTPS request to Forge API
 */
function makeForgeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: FORGE_API_BASE,
      port: 443,
      path: `/api${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${FORGE_API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Handle empty responses (like 204)
        if (!data) {
          return resolve({ statusCode: res.statusCode, data: null });
        }

        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Handle API errors with appropriate messages
 */
function handleApiError(statusCode, data) {
  const errorMessages = {
    401: 'Authentication failed. Please check your FORGE_API_TOKEN.',
    403: 'Access forbidden. You do not have permission to perform this action.',
    404: 'Resource not found. Please check your organization, server, and site IDs.',
    422: 'Unprocessable entity. Invalid request data.',
    429: 'Rate limit exceeded. Please try again later.',
    500: 'Forge server error. Please try again later.',
    503: 'Forge is offline for maintenance.'
  };

  const message = errorMessages[statusCode] || `API request failed with status ${statusCode}`;
  const details = data?.message || '';
  
  throw new Error(`${message}${details ? ` - ${details}` : ''}`);
}

/**
 * Create a new deployment
 */
async function createDeployment() {
  console.log('\n🚀 Starting deployment...');
  
  const path = `/orgs/${FORGE_ORGANIZATION}/servers/${FORGE_SERVER_ID}/sites/${FORGE_SITE_ID}/deployments`;
  
  try {
    const response = await makeForgeRequest('POST', path);
    
    if (response.statusCode !== 202) {
      handleApiError(response.statusCode, response.data);
    }

    const deploymentId = response.data.data.id;
    console.log(`✓ Deployment created (ID: ${deploymentId})`);
    
    return deploymentId;
  } catch (error) {
    console.error('❌ Failed to create deployment:', error.message);
    throw error;
  }
}

/**
 * Get deployment status
 */
async function getDeploymentStatus(deploymentId) {
  const path = `/orgs/${FORGE_ORGANIZATION}/servers/${FORGE_SERVER_ID}/sites/${FORGE_SITE_ID}/deployments/${deploymentId}`;
  
  try {
    const response = await makeForgeRequest('GET', path);
    
    if (response.statusCode !== 200) {
      handleApiError(response.statusCode, response.data);
    }

    return response.data.data.attributes;
  } catch (error) {
    // Don't throw on polling errors, just log and retry
    console.error('⚠️  Failed to fetch deployment status:', error.message);
    return null;
  }
}

/**
 * Get deployment output/logs
 */
async function getDeploymentOutput(deploymentId) {
  const path = `/orgs/${FORGE_ORGANIZATION}/servers/${FORGE_SERVER_ID}/sites/${FORGE_SITE_ID}/deployments/${deploymentId}/log`;
  
  try {
    const response = await makeForgeRequest('GET', path);
    
    if (response.statusCode !== 200) {
      return null;
    }

    return response.data.data.attributes?.output || '';
  } catch (error) {
    return null;
  }
}

/**
 * Display deployment logs
 */
function displayLogs(output, lastDisplayedLength) {
  if (!output || output.length <= lastDisplayedLength) {
    return lastDisplayedLength;
  }

  const newContent = output.substring(lastDisplayedLength);
  if (newContent.trim()) {
    console.log('\n--- Deployment Output ---');
    console.log(newContent);
    console.log('------------------------\n');
  }

  return output.length;
}

/**
 * Poll deployment status until completion
 */
async function pollDeployment(deploymentId) {
  const startTime = Date.now();
  let lastDisplayedLength = 0;
  let lastStatus = '';

  console.log('\n⏳ Monitoring deployment...\n');

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        // Check timeout
        if (Date.now() - startTime > TIMEOUT) {
          clearInterval(pollInterval);
          console.error('\n❌ Deployment timeout after 10 minutes');
          reject(new Error('Deployment timeout'));
          return;
        }

        // Get current status
        const deployment = await getDeploymentStatus(deploymentId);
        
        if (!deployment) {
          // Failed to get status, will retry on next interval
          return;
        }

        const status = deployment.status;

        // Show status updates
        if (status !== lastStatus) {
          console.log(`📊 Status: ${status}`);
          lastStatus = status;
        }

        // Fetch and display logs
        const output = await getDeploymentOutput(deploymentId);
        if (output) {
          lastDisplayedLength = displayLogs(output, lastDisplayedLength);
        }

        // Check terminal states
        if (status === 'finished') {
          clearInterval(pollInterval);
          console.log('\n✅ Deployment completed successfully!');
          resolve({ status, output });
        } else if (status === 'failed' || status === 'failed-build') {
          clearInterval(pollInterval);
          
          // Show final logs
          const finalOutput = await getDeploymentOutput(deploymentId);
          if (finalOutput) {
            console.error('\n--- Final Deployment Output ---');
            console.error(finalOutput);
            console.error('-------------------------------\n');
          }
          
          reject(new Error(`Deployment ${status}`));
        } else if (status === 'cancelled') {
          clearInterval(pollInterval);
          reject(new Error('Deployment was cancelled'));
        }

      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, POLL_INTERVAL);
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔧 Laravel Forge Deployment Action\n');
    console.log('═'.repeat(50));
    
    // Validate environment
    validateEnvironment();
    
    // Create deployment
    const deploymentId = await createDeployment();
    
    // Poll until completion
    await pollDeployment(deploymentId);
    
    console.log('\n' + '═'.repeat(50));
    console.log('✅ Action completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '═'.repeat(50));
    console.error('❌ Action failed:', error.message);
    process.exit(1);
  }
}

// Run the action
main();
