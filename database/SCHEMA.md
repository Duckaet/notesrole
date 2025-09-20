# Database Schema Documentation

## Multi-Tenancy Architecture

This application uses a **Shared Schema with Tenant ID** approach for multi-tenancy.

### Architecture Decision

We chose the shared schema approach because:

1. **Simplicity**: Single database schema is easier to maintain and migrate
2. **Cost-Effective**: Shared resources reduce infrastructure costs
3. **Scalability**: Easier to scale horizontally with connection pooling
4. **Data Consistency**: Cross-tenant analytics and reporting are possible
5. **Development Speed**: Faster development and testing cycles

### Schema Design

#### Core Entities

##### Tenants Table
- Stores tenant information and subscription plans
- Each tenant has a unique slug (e.g., "acme", "globex")
- Tracks subscription plan (FREE/PRO) for feature gating

##### Users Table
- Multi-tenant aware with `tenantId` foreign key
- Email uniqueness enforced per tenant (not globally)
- Role-based access control (ADMIN/MEMBER)
- Cascade deletion when tenant is removed

##### Notes Table
- All notes belong to both a user and a tenant
- Double isolation: by user AND tenant
- Cascade deletion for data consistency

### Data Isolation Strategy

1. **Application-Level Isolation**: All queries include tenant context
2. **Foreign Key Constraints**: Ensure referential integrity
3. **Unique Constraints**: Email uniqueness scoped to tenant
4. **Row-Level Security**: Implemented in application logic

### Subscription Feature Gating

- FREE plan: Limited to 3 notes per tenant
- PRO plan: Unlimited notes
- Plan upgrades are immediate (no migration required)

### Security Considerations

1. **Tenant Context Validation**: Every request validates tenant membership
2. **JWT Token Inclusion**: Tenant ID embedded in authentication tokens
3. **Query Filtering**: All database queries automatically filtered by tenant
4. **Data Segregation**: Logical separation prevents cross-tenant data access

### Alternative Approaches Considered

1. **Schema-per-Tenant**: More isolated but complex to maintain
2. **Database-per-Tenant**: Maximum isolation but expensive and complex
3. **Hybrid Approach**: Different schemas for different data sensitivity levels

The shared schema approach was selected for this application due to the moderate security requirements and the need for rapid development and deployment.