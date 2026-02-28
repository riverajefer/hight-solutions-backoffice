# Environment Setup Guide

This guide explains how to configure and manage the three environments for the High Solutions Backoffice project:

- **Development**: Local development with Supabase PostgreSQL
- **Staging**: QA environment on Railway with PostgreSQL
- **Production**: Production environment on Railway with PostgreSQL

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [Backend Configuration](#backend-configuration)
3. [Frontend Configuration](#frontend-configuration)
4. [Railway Deployment](#railway-deployment)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Switching Between Environments](#switching-between-environments)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Environment Overview

### Database Strategy

All environments use **PostgreSQL**:

| Environment | Database | Purpose |
|------------|----------|---------|
| **Development** | Supabase PostgreSQL | Local development, testing features |
| **Staging** | Railway PostgreSQL | QA testing before production |
| **Production** | Railway PostgreSQL | Live production data |

### Environment-Specific Features

| Feature | Development | Staging | Production |
|---------|------------|---------|------------|
| Demo Credentials Display | ✅ Visible | ❌ Hidden | ❌ Hidden |
| Verbose Logging | ✅ Enabled | ⚠️ Limited | ❌ Errors Only |
| JWT Secrets | Lenient | Strong | Strong |
| Database Seed Data | ✅ Yes | Optional | ❌ No |

---

## Backend Configuration

### 1. Initial Setup

#### Step 1: Copy Environment File

```bash
cd backend

# For local development
cp .env.example .env.development

# Update .env.development with your Supabase credentials
```

#### Step 2: Configure Environment Variables

Edit `.env.development`:

```env
# Database - Your Supabase PostgreSQL URL
DATABASE_URL="postgresql://user:password@host:port/database"

# JWT Configuration - Development
JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Application
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"
```

#### Step 3: Install Dependencies

```bash
npm install
```

#### Step 4: Run Migrations and Seed

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

### 2. Running Backend

```bash
# Development mode (uses .env.development)
npm run start:dev

# Staging mode (uses .env.staging)
npm run start:staging

# Production mode (uses .env.production)
npm run start:prod
```

### 3. Environment Detection in Code

Use the environment utility to check the current environment:

```typescript
import { isDevelopment, isProduction, getEnvironment } from '@common/utils/environment.util';

// Check environment
if (isDevelopment()) {
  console.log('Running in development mode');
}

// Get environment name
const env = getEnvironment(); // 'development' | 'staging' | 'production'
```

---

## Frontend Configuration

### 1. Initial Setup

#### Step 1: Copy Environment File

```bash
cd frontend

# For local development
cp .env.example .env.development
```

#### Step 2: Configure Environment Variables

Edit `.env.development`:

```env
# API URL - Local backend
VITE_API_URL=http://localhost:3000/api/v1

# Application Name
VITE_APP_NAME=High Solutions Backoffice

# Environment
VITE_ENVIRONMENT=development

# Show demo credentials in login form
VITE_SHOW_DEMO_CREDENTIALS=true
```

#### Step 3: Install Dependencies

```bash
npm install
```

### 2. Running Frontend

```bash
# Development mode (uses .env.development)
npm run dev

# Build for staging (uses .env.staging)
npm run build:staging

# Build for production (uses .env.production)
npm run build:prod

# Preview production build
npm run preview
```

### 3. Environment Detection in Code

Use the environment utility to check the current environment:

```typescript
import {
  isDevelopment,
  showDemoCredentials,
  getEnvironment
} from '@/utils/environment';

// Conditionally show demo credentials
{showDemoCredentials() && (
  <Box>Demo credentials here</Box>
)}

// Check environment
if (isDevelopment()) {
  console.log('Running in development mode');
}
```

---

## Railway Deployment

### 1. Backend Deployment

#### Step 1: Create Railway Service

1. Go to [Railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Connect your GitHub repository

#### Step 2: Configure Environment Variables

In Railway dashboard, set the following environment variables:

**For Staging:**
```
NODE_ENV=staging
DATABASE_URL=<railway-postgres-url>
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
FRONTEND_URL=https://your-staging-frontend.up.railway.app
PORT=3000
```

**For Production:**
```
NODE_ENV=production
DATABASE_URL=<railway-postgres-url>
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
FRONTEND_URL=https://your-production-frontend.up.railway.app
PORT=3000
```

#### Step 3: Generate Strong Secrets

Generate strong JWT secrets:

```bash
# Access secret
openssl rand -base64 32

# Refresh secret
openssl rand -base64 32
```

#### Step 4: Deploy

Railway will automatically deploy when you push to the configured branch.

### 2. Frontend Deployment

#### Step 1: Create Railway Service

1. In the same Railway project
2. Add new service
3. Connect frontend repository/directory

#### Step 2: Configure Environment Variables

**For Staging:**
```
VITE_API_URL=https://your-staging-backend.up.railway.app/api/v1
VITE_APP_NAME=High Solutions Backoffice (QA)
VITE_ENVIRONMENT=staging
VITE_SHOW_DEMO_CREDENTIALS=false
```

**For Production:**
```
VITE_API_URL=https://your-production-backend.up.railway.app/api/v1
VITE_APP_NAME=High Solutions Backoffice
VITE_ENVIRONMENT=production
VITE_SHOW_DEMO_CREDENTIALS=false
```

#### Step 3: Configure Build Command

Railway will use the build command from `package.json`:
- Staging: `npm run build:staging`
- Production: `npm run build:prod`

---

## Environment Variables Reference

### Backend Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Environment name (development, staging, production) |
| `PORT` | number | `3000` | Server port |
| `DATABASE_URL` | string | - | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | string | - | Secret for access tokens |
| `JWT_REFRESH_SECRET` | string | - | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRATION` | string | `15m` | Access token expiration time |
| `JWT_REFRESH_EXPIRATION` | string | `7d` | Refresh token expiration time |
| `FRONTEND_URL` | string | - | Frontend URL for CORS |

### Frontend Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_URL` | string | - | Backend API URL |
| `VITE_APP_NAME` | string | - | Application name |
| `VITE_ENVIRONMENT` | string | `development` | Environment name |
| `VITE_SHOW_DEMO_CREDENTIALS` | boolean | `false` | Show demo credentials on login |

---

## Switching Between Environments

### Local Development

1. **Backend**: Runs with `.env.development` automatically when using `npm run start:dev`
2. **Frontend**: Runs with `.env.development` automatically when using `npm run dev`

### Testing Staging Locally

```bash
# Backend
NODE_ENV=staging npm run start:staging

# Frontend (after building)
npm run build:staging
npm run preview
```

### Testing Production Locally

```bash
# Backend
NODE_ENV=production npm run start:prod

# Frontend (after building)
npm run build:prod
npm run preview
```

---

## Security Best Practices

### 1. Never Commit Secrets

❌ **DO NOT** commit these files:
- `.env`
- `.env.development`
- `.env.staging`
- `.env.production`

✅ **DO commit**:
- `.env.example` (without real credentials)

### 2. Use Strong Secrets

```bash
# Generate strong 256-bit secrets
openssl rand -base64 32
```

### 3. Rotate Secrets Regularly

- Rotate JWT secrets every quarter
- Update all environments when rotating
- Keep old secrets for 24h to allow active sessions to expire

### 4. Environment-Specific .gitignore

Both backend and frontend `.gitignore` files now include:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.staging
.env.production
!.env.example
```

---

## Troubleshooting

### Backend Issues

#### "Cannot connect to database"

**Solution:**
1. Check `DATABASE_URL` is correct
2. Verify database is running
3. Check firewall/network settings
4. For Supabase: Enable pooling if needed

#### "Environment file not found"

**Solution:**
```bash
# Ensure you have the correct environment file
ls -la backend/.env.*

# Create from example if missing
cp .env.example .env.development
```

#### "JWT secret not set"

**Solution:**
1. Check `.env.development` has `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
2. Generate new secrets if needed: `openssl rand -base64 32`

### Frontend Issues

#### "Demo credentials not showing"

**Solution:**
1. Check `VITE_SHOW_DEMO_CREDENTIALS=true` in `.env.development`
2. Restart dev server: `npm run dev`
3. Clear browser cache

#### "API calls failing with CORS error"

**Solution:**
1. Check `FRONTEND_URL` in backend `.env.development`
2. Verify it matches your frontend URL (usually `http://localhost:5173`)
3. Restart backend server

#### "Environment variable not updating"

**Solution:**
1. Vite caches environment variables
2. Stop dev server
3. Delete `.vite` cache folder
4. Restart: `npm run dev`

### Railway Deployment Issues

#### "Build failing on Railway"

**Solution:**
1. Check Railway build logs
2. Verify all environment variables are set
3. Ensure `NODE_ENV` is set correctly
4. Check `railway.toml` configuration

#### "Database connection failing on Railway"

**Solution:**
1. Verify `DATABASE_URL` environment variable
2. Check Railway database is running
3. Ensure connection string includes correct credentials
4. Check Railway network configuration

---

## Additional Resources

- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Railway Documentation](https://docs.railway.app/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

**Last Updated**: 2026-02-10
**Version**: 1.0.0
