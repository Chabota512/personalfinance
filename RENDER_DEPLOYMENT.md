
# Quick Deployment Guide for Render.com

## Required Environment Variables for Render.com

Set these in your Render.com dashboard under "Environment":

### Essential Variables
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
SESSION_SECRET=your-random-secret-here
```

### Optional Variables
```
GEMINI_API_KEY=your-gemini-api-key
```

## Database Connection String (Neon)

Your DATABASE_URL should look like:
```
postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/personalfinance?sslmode=require
```

Get this from your Neon dashboard.

## Deploy Steps

1. **Fork/Clone Repository**
   - Push to your GitHub account

2. **Create Render Service**
   - Go to dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select the repository

3. **Configure Service**
   - Name: `personalfinance-pro`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: `Free`
   
   **Important**: The build command MUST be `npm install && npm run build` to compile TypeScript to JavaScript.

4. **Add Environment Variables**
   - Click "Environment" tab
   - Add all variables listed above

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)

6. **Get Your URL**
   - Copy the URL (e.g., `https://personalfinance-pro.onrender.com`)
   - Use this for `VITE_API_URL` in mobile app

## Testing Your Deployment

Visit: `https://your-app.onrender.com/api/health`

Should return: `{"status":"ok"}`

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure `package.json` has all dependencies
- Verify Node version compatibility

### App Won't Start
- Check start command is `npm start`
- Verify PORT is set to 10000
- Check application logs

### Database Connection Fails
- Verify DATABASE_URL format
- Ensure `?sslmode=require` is included
- Check Neon database is running
- Verify network access from Render IP

### 502 Bad Gateway
- App might be crashing on start
- Check logs for errors
- Verify all environment variables are set
