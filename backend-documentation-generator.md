# Skill: Backend Documentation Generator

**Purpose:** Generate comprehensive technical documentation analyzing every file, database table, API endpoint, and workflow in the backend.

**When to use:** Onboarding, architecture review, technical documentation, knowledge transfer.

---

## Skill Trigger

When user says:

- "Generate backend documentation"
- "Document the entire backend"
- "Analyze all backend files"
- "Create architecture report"
- "I need complete backend documentation"

---

## Execution Instructions

### Phase 1: File Discovery & Reading (10 minutes)

**Step 1:** List entire backend structure

```bash
tree backend/ -L 4 -I 'node_modules|dist|coverage'
```

**Step 2:** Read ALL configuration files

- `view backend/package.json`
- `view backend/tsconfig.json`
- `view backend/.env.example`
- `view backend/Dockerfile`
- `view backend/docker-compose.yml`
- `view backend/README.md`

**Step 3:** Read database schema

- `view backend/prisma/schema.prisma`
- `view backend/prisma/migrations/` (list all)
- Read each migration file individually

**Step 4:** Read main application files

- `view backend/src/index.ts`
- `view backend/src/app.ts`

**Step 5:** Read ALL config files

- `view backend/src/config/env.ts`
- `view backend/src/config/database.ts`
- `view backend/src/config/redis.ts`
- Any other files in `src/config/`

**Step 6:** Read ALL route files

```bash
# List all route files first
ls backend/src/routes/

# Then read each one
view backend/src/routes/auth.routes.ts
view backend/src/routes/user.routes.ts
view backend/src/routes/progress.routes.ts
view backend/src/routes/class.routes.ts
view backend/src/routes/admin.routes.ts
view backend/src/routes/stripe.routes.ts
view backend/src/routes/health.routes.ts
# ... continue for ALL route files
```

**Step 7:** Read ALL service files

```bash
ls backend/src/services/

view backend/src/services/auth.service.ts
view backend/src/services/user.service.ts
view backend/src/services/progress.service.ts
view backend/src/services/class.service.ts
view backend/src/services/email.service.ts
view backend/src/services/stripe.service.ts
# ... continue for ALL service files
```

**Step 8:** Read ALL repository files

```bash
ls backend/src/repositories/

view backend/src/repositories/user.repository.ts
view backend/src/repositories/student.repository.ts
view backend/src/repositories/teacher.repository.ts
view backend/src/repositories/class.repository.ts
view backend/src/repositories/progress.repository.ts
# ... continue for ALL repository files
```

**Step 9:** Read ALL middleware files

```bash
ls backend/src/middleware/

view backend/src/middleware/auth.middleware.ts
view backend/src/middleware/tenant.middleware.ts
view backend/src/middleware/errorHandler.ts
view backend/src/middleware/timing.middleware.ts
# ... continue for ALL middleware files
```

**Step 10:** Read ALL utility files

```bash
ls backend/src/utils/

view backend/src/utils/errors.ts
view backend/src/utils/jwt.ts
view backend/src/utils/password.ts
view backend/src/utils/logger.ts
view backend/src/utils/metrics.ts
view backend/src/utils/validation.ts
# ... continue for ALL utility files
```

**Step 11:** Read ALL type definition files

```bash
ls backend/src/types/

# Read each type file
```

**Step 12:** Read test structure

```bash
ls backend/src/__tests__/
# Note test organization
```

---

### Phase 2: Database Analysis (15 minutes)

**Extract from schema.prisma:**

1. **List all models** (tables)
2. **For each model, document:**
   - Table name
   - All fields with types
   - All relationships (@relation)
   - All indexes (@@index, @@unique)
   - All constraints (@@map, @default, @id)
   - Primary keys
   - Foreign keys
3. **List all enums**
4. **Map relationships:**
   - One-to-one
   - One-to-many
   - Many-to-many
5. **Generate text-based ER diagram**

**Analyze migrations:**

- List all migration files chronologically
- Document what each migration does
- Note schema evolution

---

### Phase 3: API Endpoint Inventory (15 minutes)

**For EACH route file:**

1. **Extract all endpoints:**
   - HTTP method (GET, POST, PATCH, DELETE)
   - Path
   - Handler function

2. **For each endpoint, document:**
   - Description (what it does)
   - Authentication required? (preHandler: requireAuth)
   - Authorization (role requirements)
   - Request validation schema (Zod)
   - Response structure
   - Rate limits (if custom)
   - Source code location (file:line)

3. **Generate API reference table:**

```
| Method | Path | Auth | Roles | Description | File |
|--------|------|------|-------|-------------|------|
```

---

### Phase 4: Service Function Analysis (10 minutes)

**For EACH service file:**

1. **List all exported functions**
2. **For each function, extract:**
   - Function signature
   - Parameters with types
   - Return type
   - What database operations it performs
   - What external services it calls
   - Error handling approach
   - Transaction usage

---

### Phase 5: Workflow Tracing (20 minutes)

**Trace complete execution flow for:**

1. User Signup
2. User Login
3. Token Refresh
4. Password Reset
5. Record Progress
6. Create Class
7. Add Student to Class
8. Stripe Checkout
9. Stripe Webhook
10. Admin Bulk Import

**For each workflow, document step-by-step:**

```
1. HTTP Request received
   ↓
2. Middleware chain (list each middleware)
   ↓
3. Route handler
   ↓
4. Validation
   ↓
5. Service layer (which service, which function)
   ↓
6. Repository layer (which queries)
   ↓
7. Database operations (actual SQL/Prisma queries)
   ↓
8. External API calls (if any)
   ↓
9. Response generation
   ↓
10. Database state changes
```

---

### Phase 6: Security Analysis (5 minutes)

**Document:**

- JWT implementation details
- Password hashing (bcrypt rounds)
- Rate limiting configuration
- CORS settings
- Security headers (Helmet)
- Row-Level Security policies
- Session management
- Tenant isolation approach

---

### Phase 7: Generate Report (10 minutes)

**Create file:** `BACKEND_COMPLETE_DOCUMENTATION.md`

---

## Report Structure Template

```markdown
# DSA Visualizer Backend - Complete Architecture Documentation

**Generated:** {current_date}
**Backend Version:** {package.json version}
**Node Version:** {engines.node from package.json}
**Database:** PostgreSQL 15+

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Architecture](#4-database-architecture)
5. [API Reference](#5-api-reference)
6. [Service Layer](#6-service-layer)
7. [Repository Layer](#7-repository-layer)
8. [Middleware](#8-middleware)
9. [Utilities](#9-utilities)
10. [Complete Workflows](#10-complete-workflows)
11. [Security Implementation](#11-security-implementation)
12. [Configuration](#12-configuration)
13. [Dependencies](#13-dependencies)
14. [Testing](#14-testing)
15. [Deployment](#15-deployment)
16. [File-by-File Reference](#16-file-by-file-reference)

---

## 1. Executive Summary

### 1.1 System Overview

{Write 3-4 paragraphs explaining:

- What the DSA Visualizer backend does
- Multi-tenant architecture (university vs global)
- Key features (auth, progress tracking, classes, payments)
- Target users (students, teachers, admins)
  }

### 1.2 Key Metrics

- **Total Files:** {count all .ts files in src/}
- **Lines of Code:** {approximate from file sizes}
- **API Endpoints:** {count from all route files}
- **Database Tables:** {count from schema.prisma}
- **Services:** {count files in services/}
- **Repositories:** {count files in repositories/}
- **Middleware:** {count files in middleware/}

### 1.3 Architecture Pattern
```

┌─────────────────────────────────────┐
│ HTTP Request │
└──────────────┬──────────────────────┘
│
┌───────▼────────┐
│ Middleware │ (Auth, Validation, Tenant)
└───────┬────────┘
│
┌───────▼────────┐
│ Controllers │ (Route Handlers)
└───────┬────────┘
│
┌───────▼────────┐
│ Services │ (Business Logic)
└───────┬────────┘
│
┌───────▼────────┐
│ Repositories │ (Data Access)
└───────┬────────┘
│
┌───────▼────────┐
│ Database │ (PostgreSQL)
└────────────────┘

```

**Pattern:** Controller → Service → Repository

**Why this pattern?**
- Separation of concerns
- Testability (easy to mock layers)
- Reusability (services can call other services)
- Security (business logic isolated from HTTP layer)

---

## 2. Technology Stack

### 2.1 Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | {from package.json} | Runtime |
| TypeScript | {version} | Type safety |
| Fastify | {version} | Web framework |
| Prisma | {version} | ORM |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Cache & sessions |
| bcrypt | {version} | Password hashing |
| jsonwebtoken | {version} | JWT auth |

### 2.2 Key Dependencies

{List all dependencies from package.json with purpose}

### 2.3 Dev Dependencies

{List devDependencies}

---

## 3. Project Structure

### 3.1 Directory Tree

```

{Paste complete tree output from Phase 1}

```

### 3.2 Directory Purposes

| Directory | Purpose | File Count |
|-----------|---------|------------|
| `src/routes/` | API endpoint definitions | {count} |
| `src/services/` | Business logic layer | {count} |
| `src/repositories/` | Database access layer | {count} |
| `src/middleware/` | Request interceptors | {count} |
| `src/utils/` | Helper functions | {count} |
| `src/types/` | TypeScript type definitions | {count} |
| `src/config/` | Configuration files | {count} |
| `prisma/` | Database schema & migrations | {count} |

---

## 4. Database Architecture

### 4.1 Schema Overview

**Total Tables:** {count models in schema.prisma}
**Total Enums:** {count enums}
**Total Relationships:** {count @relation}
**Total Indexes:** {count @@index and @@unique}

### 4.2 Entity-Relationship Diagram

```

{Generate complete ER diagram in text format, showing all tables and relationships}

Example format:

┌──────────────────┐
│ organizations │
│──────────────────│
│ id (PK) │
│ name │
│ slug (UQ) │
│ org_type │
│ allowed_domains │
└────────┬─────────┘
│
│ 1:N
│
┌────────▼─────────┐
│ users │
│──────────────────│
│ id (PK) │
│ org_id (FK) │
│ email (UQ) │
│ password_hash │
│ role │
└────────┬─────────┘
│
├─── 1:1 ──→ ┌──────────┐
│ │ students │
│ └──────────┘
│
└─── 1:1 ──→ ┌──────────┐
│ teachers │
└──────────┘

````

### 4.3 Complete Table Documentation

---

#### 4.3.1 Table: `organizations`

**Purpose:** Stores organization data for multi-tenant architecture

**Schema Definition:**
```prisma
{Paste actual model from schema.prisma}
````

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
| ------ | ---- | -------- | ------- | ----------- | ----------- |

{List every column from schema with full details}

**Indexes:**

```sql
{List all indexes for this table}
```

**Relationships:**

- **Has Many:** `users` via `org_id`
- **Has Many:** `students` via `org_id`
- **Has Many:** `teachers` via `org_id`
- **Has Many:** `classes` via `org_id`

**Row-Level Security:**

```sql
{Paste RLS policies if they exist in migrations}
```

**Sample Data:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Stanford University",
  "slug": "stanford",
  "org_type": "university",
  "allowed_domains": ["stanford.edu"],
  "tier": "enterprise",
  "is_active": true,
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

**Usage Patterns:**

- Queried on every authenticated request for tenant isolation
- Filtered by `slug` during signup
- Used in JOIN queries for user lists

**Performance Notes:**

- Index on `slug` ensures fast lookups
- `org_type` discriminator enables efficient filtering

---

{REPEAT FOR EVERY TABLE - ALL 13+ TABLES}

#### 4.3.2 Table: `users`

{Complete documentation}

#### 4.3.3 Table: `students`

{Complete documentation}

#### 4.3.4 Table: `teachers`

{Complete documentation}

#### 4.3.5 Table: `classes`

{Complete documentation}

#### 4.3.6 Table: `class_students`

{Complete documentation}

#### 4.3.7 Table: `user_progress`

{Complete documentation}

#### 4.3.8 Table: `subscriptions`

{Complete documentation}

#### 4.3.9 Table: `sessions`

{Complete documentation}

#### 4.3.10 Table: `audit_logs`

{Complete documentation}

#### 4.3.11 Table: `email_logs`

{Complete documentation}

#### 4.3.12 Table: `password_reset_tokens`

{Complete documentation}

#### 4.3.13 Table: `bulk_imports`

{Complete documentation}

---

### 4.4 Enums

{Document all enums from schema}

#### Enum: `UserRole`

```typescript
{Paste enum definition}
```

**Values:**

- `USER` - Global platform users
- `PREMIUM` - Paid subscribers
- `STUDENT` - University students
- `TEACHER` - University instructors
- `ADMIN` - Organization administrators
- `SUPER_ADMIN` - Platform administrators

**Used In:**

- `users.role`

---

### 4.5 Migration History

{List all migration files with descriptions}

| Date | Migration | Description | Type |
| ---- | --------- | ----------- | ---- |

{Parse from migration file names and content}

---

### 4.6 Data Storage Analysis

**How User Data is Stored:**

- Passwords: bcrypt hash, 12 rounds, stored in `users.password_hash`
- Sessions: Redis, 24-hour TTL, key format: `session:{userId}`
- Tokens: Refresh tokens in httpOnly cookies, access tokens in memory

**How Progress is Tracked:**

- Table: `user_progress`
- Granularity: Per user, per problem
- Updates: UPSERT operations
- Metrics: status, attempts, time_spent_seconds, solved_at

**How Audit Logs Work:**

- Table: `audit_logs`
- Events logged: AUTH, USER_MANAGEMENT, ADMIN_ACTIONS
- Retention: 90 days active, archived after
- Metadata: JSONB for flexible data

---

## 5. API Reference

### 5.1 API Overview

**Base URL:** `http://localhost:5000/api`
**Protocol:** HTTP/1.1
**Authentication:** Bearer JWT in Authorization header
**Content-Type:** `application/json`

**Global Rate Limits:**

- Anonymous: 100 requests / 15 minutes / IP
- Authenticated: 1000 requests / 15 minutes / user

---

### 5.2 Authentication Endpoints

---

#### 5.2.1 POST /api/auth/signup

**Description:** Create a new user account

**File:** `src/routes/auth.routes.ts` (line {X})

**Authentication:** Not required

**Rate Limit:** 5 requests / 15 minutes / IP

**Request Schema:**

```typescript
{Paste Zod schema from route file}
```

**Request Body:**

```json
{
  "email": "student@stanford.edu",
  "password": "SecurePass123!",
  "name": "John Doe",
  "orgSlug": "stanford",
  "registerNumber": "CS2024001",
  "degree": "B.Tech",
  "batch": "2024"
}
```

**Response (201 Created):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@stanford.edu",
    "name": "John Doe",
    "role": "STUDENT",
    "orgId": "org-uuid"
  }
}
```

**Cookies Set:**

```
refreshToken=eyJhbGci...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/api/auth
```

**Error Responses:**

| Status | Code                  | Message                  | When                   |
| ------ | --------------------- | ------------------------ | ---------------------- |
| 400    | VALIDATION_ERROR      | Invalid input data       | Zod validation fails   |
| 404    | NOT_FOUND             | Organization not found   | Invalid orgSlug        |
| 409    | CONFLICT              | Email already registered | Duplicate email        |
| 500    | INTERNAL_SERVER_ERROR | Server error             | Database/email failure |

**Example cURL:**

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@stanford.edu",
    "password": "SecurePass123!",
    "name": "John Doe",
    "orgSlug": "stanford",
    "registerNumber": "CS2024001",
    "degree": "B.Tech",
    "batch": "2024"
  }'
```

**Implementation Details:**

**Service:** `authService.signup()`
**File:** `src/services/auth.service.ts` (line {X})

**Execution Flow:**

1. Validate organization exists
2. Check email domain (university only)
3. Hash password (bcrypt, 12 rounds)
4. Create user + student profile (transaction)
5. Generate JWT tokens
6. Send welcome email (async)
7. Log audit event
8. Return tokens + user

**Database Operations:**

```sql
-- Check organization
SELECT * FROM organizations WHERE slug = $1;

-- Check email uniqueness
SELECT id FROM users WHERE email = $1;

-- Insert user and student
BEGIN;
INSERT INTO users (...) VALUES (...);
INSERT INTO students (...) VALUES (...);
COMMIT;

-- Log event
INSERT INTO audit_logs (...) VALUES (...);
```

**Performance:**

- Avg response time: ~260ms
- Breakdown:
  - Password hashing: ~200ms
  - Database queries: ~40ms
  - JWT generation: ~5ms
  - Other: ~15ms

---

{REPEAT FOR EVERY ENDPOINT - ALL 30+ ENDPOINTS}

#### 5.2.2 POST /api/auth/login

{Complete documentation}

#### 5.2.3 POST /api/auth/refresh

{Complete documentation}

#### 5.2.4 POST /api/auth/logout

{Complete documentation}

#### 5.2.5 POST /api/auth/forgot-password

{Complete documentation}

#### 5.2.6 POST /api/auth/reset-password

{Complete documentation}

---

### 5.3 User Endpoints

#### 5.3.1 GET /api/users/me

{Complete documentation}

#### 5.3.2 PATCH /api/users/me

{Complete documentation}

#### 5.3.3 DELETE /api/users/me

{Complete documentation}

---

### 5.4 Progress Endpoints

{Document all progress endpoints}

---

### 5.5 Class Endpoints

{Document all class endpoints}

---

### 5.6 Admin Endpoints

{Document all admin endpoints}

---

### 5.7 Stripe Endpoints

{Document all stripe endpoints}

---

### 5.8 Health & Metrics Endpoints

{Document health and metrics endpoints}

---

## 6. Service Layer

### 6.1 Service Overview

**Pattern:** Services contain all business logic

**Responsibilities:**

- Input validation
- Business rule enforcement
- Transaction coordination
- External service integration
- Error handling

**Services:**
{List all service files}

---

### 6.2 Auth Service

**File:** `src/services/auth.service.ts`

**Purpose:** Handle user authentication and authorization

**Exported Functions:**

---

#### Function: `signup(data: SignupDTO): Promise<AuthResponse>`

**Purpose:** Create new user account

**Parameters:**

```typescript
data: {
  email: string;
  password: string;
  name: string;
  orgSlug: string;
  registerNumber?: string;
  degree?: string;
  batch?: string;
}
```

**Returns:**

```typescript
{
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    orgId: string;
  }
}
```

**Implementation:**

```typescript
{Paste actual function code from file}
```

**Business Logic:**

1. Validate organization exists and is active
2. For universities: validate email domain
3. Check email uniqueness
4. Hash password with bcrypt (12 rounds)
5. Create user + profile in transaction
6. Generate JWT tokens
7. Send welcome email (async, non-blocking)
8. Log audit event

**Database Queries:**

- `organizations.findUnique({ where: { slug } })`
- `users.findUnique({ where: { email } })`
- `users.create()` + `students.create()` in transaction
- `auditLogs.create()`

**External Services:**

- Email service (Resend API)

**Error Handling:**

- Throws `NotFoundError` if organization not found
- Throws `ValidationError` if email domain invalid
- Throws `ConflictError` if email already exists
- Throws `InternalServerError` for database/email failures

**Performance:**

- Average: ~260ms
- Slowest part: bcrypt hashing (~200ms)

---

{REPEAT FOR EVERY SERVICE FUNCTION IN EVERY SERVICE FILE}

---

### 6.3 User Service

**File:** `src/services/user.service.ts`

{Document all functions}

---

### 6.4 Progress Service

**File:** `src/services/progress.service.ts`

{Document all functions}

---

### 6.5 Class Service

**File:** `src/services/class.service.ts`

{Document all functions}

---

### 6.6 Email Service

**File:** `src/services/email.service.ts`

{Document all functions}

---

### 6.7 Stripe Service

**File:** `src/services/stripe.service.ts`

{Document all functions}

---

## 7. Repository Layer

{Document all repositories and their functions}

---

## 8. Middleware

### 8.1 Middleware Execution Order

```
1. Helmet (security headers)
2. CORS
3. Rate limiting
4. Request logging
5. Authentication (requireAuth)
6. Tenant isolation (attachTenant)
7. Authorization (requireRole)
8. Validation (Zod schemas)
9. Route handler
10. Error handler (if error thrown)
```

### 8.2 Authentication Middleware

**File:** `src/middleware/auth.middleware.ts`

**Function:** `requireAuth(req, res, next)`

**Purpose:** Verify JWT and attach user to request

**Implementation:**

```typescript
{Paste actual code}
```

**What it does:**

1. Extract Bearer token from Authorization header
2. Verify JWT signature
3. Check expiration
4. Decode payload
5. Attach user to `req.user`
6. Set PostgreSQL session variables for RLS

**Errors:**

- 401 if missing/invalid/expired token

---

{Document all other middleware}

---

## 9. Utilities

{Document all utility files and functions}

---

## 10. Complete Workflows

### 10.1 User Signup Workflow (University Student)

**Complete Step-by-Step Execution:**

```
1. USER ACTION
   Frontend form submission
   Data: { email, password, name, orgSlug, registerNumber, degree, batch }

2. HTTP REQUEST
   POST http://localhost:5000/api/auth/signup
   Headers: { "Content-Type": "application/json" }
   Body: {JSON data}

3. MIDDLEWARE CHAIN

   a. Helmet (app.ts:45)
      - Adds security headers
      Duration: <1ms
      → NEXT

   b. CORS (app.ts:52)
      - Validates origin
      Duration: <1ms
      → NEXT

   c. Rate Limit (auth.routes.ts:23)
      - Check: 5 req/15min/IP
      - Current count: 2
      Duration: 1ms
      → NEXT

   d. Request Logger (app.ts:60)
      - Logs request
      Duration: 1ms
      → NEXT

4. ROUTE HANDLER (auth.routes.ts:67)

   a. Zod Validation
      - Validates all fields
      Duration: 2ms
      → NEXT or 400 error

   b. Calls authService.signup()

5. AUTH SERVICE EXECUTION (auth.service.ts:89)

   a. Validate Organization (Line 92)
      Query: SELECT * FROM organizations WHERE slug = 'stanford'
      Result: { id: 'org-uuid', name: 'Stanford', ... }
      Duration: 8ms

   b. Validate Email Domain (Line 100)
      Logic: 'stanford.edu' in allowedDomains?
      Result: ✓ Valid
      Duration: <1ms

   c. Check Email Uniqueness (Line 108)
      Query: SELECT id FROM users WHERE email = 'student@stanford.edu'
      Result: null (available)
      Duration: 7ms

   d. Hash Password (Line 114)
      Algorithm: bcrypt with 12 rounds
      Input: 'SecurePass123!'
      Output: '$2b$12$KZJaB5...'
      Duration: 203ms

   e. Database Transaction (Line 118)
      BEGIN;

      INSERT INTO users (id, email, password_hash, name, role, org_id, ...)
      VALUES ('user-uuid', 'student@stanford.edu', '$2b$12$...', 'John Doe', 'STUDENT', 'org-uuid', ...);
      Result: { id: 'user-uuid', ... }
      Duration: 12ms

      INSERT INTO students (id, user_id, org_id, register_number, degree, batch, ...)
      VALUES ('student-uuid', 'user-uuid', 'org-uuid', 'CS2024001', 'B.Tech', '2024', ...);
      Result: { id: 'student-uuid', ... }
      Duration: 8ms

      COMMIT;

      Total transaction: 20ms

   f. Generate JWT (Line 144)
      Access token: exp 15min
      Refresh token: exp 7d
      Duration: 3ms

   g. Send Email (Line 151) [ASYNC]
      POST https://api.resend.com/emails
      Duration: ~500ms (non-blocking)

   h. Log Audit Event (Line 158)
      INSERT INTO audit_logs (...)
      Duration: 5ms

6. RESPONSE
   Status: 201 Created
   Body: { accessToken, user }
   Cookie: refreshToken (httpOnly)
   Duration: 2ms

7. TOTAL TIME: ~263ms

8. DATABASE STATE AFTER:
   - 1 new row in users
   - 1 new row in students
   - 1 new row in audit_logs
   - 1 new email log (after email sends)
```

---

{REPEAT FOR ALL MAJOR WORKFLOWS}

### 10.2 User Login Workflow

{Complete documentation}

### 10.3 Token Refresh Workflow

{Complete documentation}

### 10.4 Password Reset Workflow

{Complete documentation}

### 10.5 Record Progress Workflow

{Complete documentation}

### 10.6 Create Class Workflow

{Complete documentation}

### 10.7 Stripe Checkout Workflow

{Complete documentation}

### 10.8 Stripe Webhook Workflow

{Complete documentation}

---

## 11. Security Implementation

{Document all security features}

---

## 12. Configuration

### 12.1 Environment Variables

{Document all env vars from .env.example}

---

## 13. Dependencies

{List all dependencies with versions and purposes}

---

## 14. Testing

{Document test structure and coverage}

---

## 15. Deployment

{Document Docker, CI/CD, health checks}

---

## 16. File-by-File Reference

### 16.1 Configuration Files

#### File: `package.json`

- **Purpose:** {description}
- **Key Scripts:** {list scripts}
- **Dependencies:** {count}

#### File: `tsconfig.json`

- **Purpose:** TypeScript configuration
- **Strict Mode:** {yes/no}
- **Target:** {ES version}

---

### 16.2 Source Files

#### File: `src/index.ts`

- **Purpose:** Application entry point
- **Line Count:** {count}
- **Exports:** {list}
- **Key Functions:** {list}

{REPEAT FOR EVERY FILE}

---

## Appendix

### A. Glossary

{Define technical terms}

### B. Common Queries

{Show example SQL queries}

### C. Performance Benchmarks

{Show timing data}

### D. Error Code Reference

{List all error codes}

---

**END OF DOCUMENTATION**

```

---

## Success Criteria

Report must include:
- [ ] All 13+ database tables documented
- [ ] All 30+ API endpoints documented
- [ ] All service functions documented
- [ ] Complete ER diagram
- [ ] 10+ complete workflow traces
- [ ] All middleware documented
- [ ] All utilities documented
- [ ] Minimum 50,000 words
- [ ] Saved as markdown file
- [ ] Code examples from actual files
- [ ] Timing/performance analysis

---

## Refusal Policy

If user requests this skill but provides insufficient file access:
- Explain which directories you need access to
- List required files
- Offer to generate partial documentation
```
