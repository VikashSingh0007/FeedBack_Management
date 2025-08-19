# Frontend Configuration Guide

## 🌍 Environment Configuration

The frontend now automatically detects your environment and uses the appropriate backend URL.

### Automatic Detection
- **Local Development**: `http://localhost:3000` (when running on localhost)
- **Production**: `https://feedback-management-1-pymq.onrender.com` (when deployed)

### Manual Override
If you want to force a specific environment, edit `src/config/config.js`:

```javascript
// Change this line to force an environment
const FORCE_ENVIRONMENT = 'development'; // or 'production'
// Set to null to auto-detect
const FORCE_ENVIRONMENT = null;
```

## 🚀 Getting Started

### 1. Start Your Local Backend
```bash
cd backend
npm run start:dev
```
This will start your backend on `http://localhost:3000`

### 2. Start Your Frontend
```bash
cd frontend
npm run dev
```
This will start your frontend on `http://localhost:5173`

### 3. Verify Configuration
- Open the Admin Panel
- You'll see a green "DEVELOPMENT" badge
- The backend URL will show `http://localhost:3000`

## 🧪 Testing

### Test Buttons in Admin Panel
1. **🧪 Test Email** - Tests email functionality
2. **🌐 Test API** - Tests API connectivity
3. **📋 Show Config** - Shows current configuration

### Console Logs
Check your browser console for detailed logs:
- Environment detection
- API requests/responses
- Configuration details

## 🔧 Troubleshooting

### Backend Not Accessible
- Make sure your backend is running on port 3000
- Check if there are any CORS issues
- Verify the backend is accessible at `http://localhost:3000`

### Wrong Environment Detected
- Check `src/config/config.js`
- Set `FORCE_ENVIRONMENT` if needed
- Refresh the page after changes

### API Calls Failing
- Check the console for error logs
- Verify the backend URL in the Admin Panel
- Use the "Test API" button to verify connectivity

## 📁 File Structure
```
frontend/
├── src/
│   ├── config/
│   │   └── config.js          # Environment configuration
│   ├── services/
│   │   └── api.js            # API service with config
│   └── pages/
│       ├── AdminPanelPage.tsx # Admin dashboard with test buttons
│       └── FeedbackDetailPage.jsx # Feedback management
```

## 🔄 Switching Environments

### To Production
1. Deploy your frontend
2. It will automatically use the production backend
3. Or force it: `FORCE_ENVIRONMENT = 'production'`

### To Development
1. Run locally on localhost
2. It will automatically use local backend
3. Or force it: `FORCE_ENVIRONMENT = 'development'`

## 📝 Notes
- Changes to `config.js` require a page refresh
- The configuration is loaded when the app starts
- All API calls automatically use the configured backend
- Test buttons help verify the current configuration
