# Multi-Tenant SaaS Notes Application

A secure, scalable multi-tenant notes application built with Next.js, TypeScript, and PostgreSQL.

## 🏗️ Architecture Overview

### Multi-Tenancy Approach: Shared Schema with Tenant ID

This application implements a **shared schema with tenant ID** approach for multi-tenancy, chosen for the following reasons:

- **Simplicity**: Single database schema is easier to maintain and migrate
- **Cost-Effective**: Shared resources reduce infrastructure costs  
- **Scalability**: Easier to scale with connection pooling
- **Development Speed**: Faster development and testing cycles
- **Data Consistency**: Enables cross-tenant analytics if needed

### Key Architecture Decisions

1. **Database Isolation**: Logical separation using tenant IDs in all tables
2. **Authentication**: JWT-based with tenant context embedded
3. **Authorization**: Role-based access control (Admin/Member)
4. **Subscription Management**: Feature gating based on tenant plans

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcryptjs
- **Deployment**: Vercel

## 📊 Database Schema

### Core Entities

```
Tenants
├── id (CUID)
├── slug (unique, e.g., "acme", "globex")
├── name (display name)
├── plan (FREE/PRO)
└── timestamps

Users
├── id (CUID)
├── email (unique per tenant)
├── password (hashed)
├── role (ADMIN/MEMBER)
├── tenantId (FK)
└── timestamps

Notes
├── id (CUID)
├── title
├── content
├── authorId (FK)
├── tenantId (FK)
└── timestamps
```

## 🔐 Security Features

- **Tenant Isolation**: All queries filtered by tenant context
- **Role-Based Access**: Admin and Member roles with different permissions
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Data Validation**: Input validation on all endpoints

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Notes Management
- `GET /api/notes` - List tenant notes
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get specific note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Tenant Management
- `POST /api/tenants/:slug/upgrade` - Upgrade tenant plan (Admin only)

### Health Check
- `GET /api/health` - Application health status

## 🔑 Test Accounts

All test accounts use password: `password`

| Email | Role | Tenant |
|-------|------|--------|
| admin@acme.test | Admin | Acme |
| user@acme.test | Member | Acme |
| admin@globex.test | Admin | Globex |
| user@globex.test | Member | Globex |

## 📋 Subscription Plans

### FREE Plan
- Maximum 3 notes per tenant
- Basic note CRUD operations
- Member invite restrictions

### PRO Plan  
- Unlimited notes
- All features unlocked
- Admin can upgrade via API

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

3. Set up database:
```bash
npx prisma migrate dev
npx prisma db seed
```

4. Start development server:
```bash
npm run dev
```

### Environment Variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/notesrole_db"
JWT_SECRET="your-super-secret-jwt-key"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
NODE_ENV="development"
CORS_ORIGINS="http://localhost:3000"
```

## 🚀 Deployment

This application is designed for deployment on Vercel:

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Production Considerations

- Set up production PostgreSQL database
- Configure proper CORS origins
- Use strong JWT secrets
- Set up database connection pooling
- Configure logging and monitoring

## 🔄 Multi-Tenant Data Flow

1. **Authentication**: User logs in with email/password
2. **Tenant Resolution**: Email domain or explicit tenant context
3. **JWT Generation**: Token includes user ID, role, and tenant ID
4. **Request Processing**: All API calls validate tenant context
5. **Data Filtering**: Database queries automatically filtered by tenant

## 📁 Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # React components
│   ├── auth/         # Authentication components
│   ├── notes/        # Notes components
│   └── ui/           # UI components
├── lib/              # Utilities and configurations
├── middleware/       # Next.js middleware
└── types/           # TypeScript type definitions

database/
├── seed.ts          # Database seeding script
└── SCHEMA.md        # Detailed schema documentation

prisma/
└── schema.prisma    # Database schema definition
```

## 🧪 Testing

The application includes comprehensive test coverage for:

- Authentication flows
- Tenant isolation
- Role-based permissions
- CRUD operations
- Subscription limits

## 📚 Additional Documentation

- [Database Schema](./database/SCHEMA.md) - Detailed schema documentation
- [API Documentation](./docs/API.md) - Complete API reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment guide

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is licensed under the MIT License.
