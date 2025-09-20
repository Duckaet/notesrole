# Environment Variables for Vercel Production Deployment

## Required Environment Variables:

### 1. DATABASE_URL
Set to your PostgreSQL database connection string (use your own database)

### 2. JWT_SECRET
Set to a secure random string for JWT token signing

### 3. NEXTAUTH_URL
Set to your production domain URL

### 4. NEXTAUTH_SECRET
Set to a secure random string for NextAuth

### 5. NODE_ENV
production

### 6. CORS_ORIGINS
Set to your production domain URL for CORS configuration

## Setup Instructions:

1. Go to https://vercel.com/dashboard
2. Navigate to your project: notesrole
3. Go to Settings > Environment Variables
4. Add each variable above as a new environment variable
5. Redeploy the application to apply the changes

## Test Accounts (All with password: "password"):
- admin@acme.test (Admin, tenant: Acme)
- user@acme.test (Member, tenant: Acme)
- admin@globex.test (Admin, tenant: Globex)
- user@globex.test (Member, tenant: Globex)

## Key Endpoints:
- Health: GET /api/health → {"status": "ok"}
- Login: POST /api/auth/login
- Notes CRUD: /api/notes
- Tenant Upgrade: POST /api/tenants/:slug/upgrade

## Requirements Compliance:
✅ Multi-tenancy with strict isolation (shared schema + tenant ID)
✅ JWT authentication with role-based access
✅ Subscription feature gating (FREE: 3 notes, PRO: unlimited)
✅ Complete Notes CRUD API with tenant isolation
✅ Frontend with login, notes management, and upgrade functionality
✅ Health endpoint for monitoring
✅ CORS enabled for automated scripts
✅ All 4 predefined test accounts ready
✅ Deployed on Vercel