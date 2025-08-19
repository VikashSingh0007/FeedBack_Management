// Environment Configuration
const config = {
  development: {
    apiBaseURL: 'http://localhost:3000',
    environment: 'development'
  },
  production: {
    apiBaseURL: 'https://feedback-management-1-pymq.onrender.com',
    environment: 'production'
  }
};

// Manual override - uncomment and set to force a specific environment
// const FORCE_ENVIRONMENT = 'development'; // or 'production'
const FORCE_ENVIRONMENT = null; // Set to null to auto-detect

// Auto-detect environment or use manual override
let isDevelopment;
if (FORCE_ENVIRONMENT) {
  isDevelopment = FORCE_ENVIRONMENT === 'development';
  console.log('🔧 [Config] Using forced environment:', FORCE_ENVIRONMENT);
} else {
  isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  console.log('🔍 [Config] Auto-detected environment');
}

const currentConfig = config[isDevelopment ? 'development' : 'production'];

console.log('🌍 [Config] Environment:', currentConfig.environment);
console.log('🌐 [Config] API Base URL:', currentConfig.apiBaseURL);
console.log('📝 [Config] To force environment, edit src/config/config.js and set FORCE_ENVIRONMENT');

export default currentConfig;
