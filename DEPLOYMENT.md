# Deployment Guide for Render

This guide explains how to deploy the Cityflo Invoice System to Render using the Blueprint configuration.

## Prerequisites

1. A GitHub account with this repository
2. A Render account (sign up at https://render.com)
3. A Gemini API key (get from https://aistudio.google.com/app/apikey)

## Deployment Steps

### 1. Connect Your Repository to Render

1. Go to the [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if you haven't already
4. Select the repository: `Aniumbott/cityflo_assignment`
5. Render will automatically detect the `render.yaml` file

### 2. Configure Environment Variables

Before deploying, you need to set up the following environment variables:

#### Backend Service Environment Variables

The following variables need to be configured in the Render Dashboard:

| Variable | Description | Example/Notes |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | Automatically provided by Render when database is created |
| `GEMINI_API_KEY` | Google Gemini API key | Get from https://aistudio.google.com/app/apikey |
| `JWT_ACCESS_SECRET` | Secret for JWT access tokens | Generate a random string (e.g., use `openssl rand -base64 32`) |
| `JWT_REFRESH_SECRET` | Secret for JWT refresh tokens | Generate a different random string |
| `FRONTEND_URL` | Frontend URL | `https://cityflo-assignment-frontend.onrender.com` |
| `PORT` | Server port | `3000` (set automatically) |
| `NODE_ENV` | Environment | `production` (set automatically) |

#### Frontend Service Environment Variables

| Variable | Description | Example/Notes |
|----------|-------------|---------------|
| `BACKEND_URL` | Backend API URL | `https://cityflo-assignment-backend.onrender.com` |

### 3. Generate JWT Secrets

You can generate secure random strings for JWT secrets using:

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Deploy

1. After configuring all environment variables in the Render Dashboard, click **"Apply"**
2. Render will automatically:
   - Create a PostgreSQL database
   - Build and deploy the backend service
   - Build and deploy the frontend service
3. The deployment will take several minutes

### 5. Post-Deployment

Once deployed, you'll have three services running:

1. **Database**: `cityflo-invoices-db` (PostgreSQL)
2. **Backend**: `cityflo-assignment-backend` (API server)
3. **Frontend**: `cityflo-assignment-frontend` (Web interface)

The frontend will be accessible at: `https://cityflo-assignment-frontend.onrender.com`

### 6. Seed the Database (Optional)

If you want to add sample data, you can run the seed script:

1. Go to the backend service in Render Dashboard
2. Open the **"Shell"** tab
3. Run: `npm run prisma:seed`

## Auto-Deployment

The `render.yaml` configuration enables automatic deployment:
- Whenever you push changes to the `master` branch, Render will automatically rebuild and redeploy your services

## Monitoring

You can monitor your services in the Render Dashboard:
- View logs for debugging
- Check deployment status
- Monitor resource usage
- View service health

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly set (Render should auto-populate this)
- Check that Prisma migrations ran successfully in the build logs

### API Connection Issues
- Verify `BACKEND_URL` in frontend matches your backend service URL
- Check CORS settings in the backend if you see cross-origin errors

### Build Failures
- Check the build logs in the Render Dashboard
- Ensure all dependencies are properly listed in `package.json`
- Verify Dockerfile configurations are correct

## Cost

All services are configured with the **free plan**:
- Free tier services spin down after 15 minutes of inactivity
- They spin back up on the next request (may take 30-60 seconds)
- Free PostgreSQL databases have a 90-day expiration

For production use, consider upgrading to paid plans for better performance and reliability.

## Using the Render CLI (Alternative Method)

If you prefer to use the Render CLI:

1. Install the Render CLI (already done if you followed this guide)
2. Login: `render login`
3. Validate your blueprint: `render blueprints validate render.yaml`
4. Deploy via the Dashboard as described above (CLI doesn't support direct blueprint deployment yet)

## References

- [Render Blueprints Documentation](https://render.com/docs/infrastructure-as-code)
- [Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Render API Documentation](https://render.com/docs/api)
