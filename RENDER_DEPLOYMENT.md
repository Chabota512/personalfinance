
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
   
   **Important**: The build command only builds the frontend (React/Vite) to `dist/public/`. The backend runs directly from TypeScript using `tsx` (no compilation needed). Make sure `tsx` is in your `dependencies`, not `devDependencies`.

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

## How It Works

The deployment uses:
- **Frontend**: Built with Vite to static files in `dist/public/`
- **Backend**: Runs directly with `tsx` (no bundling) from `server/index.ts`
- **Production Mode**: Set via `NODE_ENV=production` environment variable

This approach avoids bundling issues and keeps Replit-specific dev dependencies isolated.

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure `package.json` has all dependencies (including `tsx` in dependencies)
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
