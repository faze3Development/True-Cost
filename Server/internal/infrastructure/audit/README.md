# Audit Logging System

## Overview

Immutable audit logging system for recording all access denial attempts and unauthorized access attempts to the True-Cost application. All logs are automatically created, indexed, and permanently stored in PostgreSQL for compliance and security monitoring.

## Features

- **Immutable Records**: All audit logs are created with timestamps and cannot be modified
- **Automatic Logging**: Every unauthorized and role-based access denial is automatically logged
- **Security Monitoring**: Detailed records include IP address, user agent, and user information
- **Query Support**: Fast indexed queries by user, action, resource, and time range
- **Tenant Isolation**: Multi-tenant safe; logs are scoped to tenant context

## Audit Log Fields

Each `AuditLog` record captures:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_key` | string | Multi-tenant scoping |
| `user_id` | UUID | User who attempted access (nullable) |
| `email` | string | User email for audit trail |
| `action` | string | e.g., `UNAUTHORIZED_ACCESS_ATTEMPT`, `ROUTE_ACCESS_DENIED` |
| `resource` | string | Route/endpoint attempted (e.g., `/api/v1/admin/users`) |
| `required_role` | string | Role required by the route (e.g., `admin`) |
| `user_role` | string | Actual role of the user (e.g., `user`) |
| `reason` | text | Human-readable reason for denial |
| `ip_address` | string | Client IP address (from X-Forwarded-For or direct connection) |
| `user_agent` | text | Browser/client information |
| `status_code` | int | HTTP status (401, 403, etc.) |
| `created_at` | timestamp | When the attempt was made |

## Actions Logged

### `UNAUTHORIZED_ACCESS_ATTEMPT`
Triggered when:
- Authorization header is missing
- Token format is invalid
- Token is expired or revoked
- Token verification fails

**Example Query**:
```sql
SELECT * FROM audit_logs 
WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'
ORDER BY created_at DESC
LIMIT 10;
```

### `ROUTE_ACCESS_DENIED`
Triggered when:
- User is authenticated but lacks required role for a route
- Role check fails in `RequireRole` middleware

**Example Query**:
```sql
SELECT * FROM audit_logs 
WHERE action = 'ROUTE_ACCESS_DENIED'
AND required_role = 'admin'
ORDER BY created_at DESC;
```

## Usage

### Protecting Routes with Role Requirements

In your router setup:

```go
// Protect all /admin routes with role requirement
adminRoutes := protected.Group("/admin")
adminRoutes.Use(auth.RequireRole("admin", userModule.Service, auditSvc))
{
    adminRoutes.GET("/users", adminModule.Handler.ListUsers)
    adminRoutes.POST("/settings", adminModule.Handler.UpdateSettings)
}
```

All access denials to these routes will be automatically logged.

### Querying Audit Logs

**Failed login attempts in the last 24 hours**:
```sql
SELECT COUNT(*), ip_address
FROM audit_logs
WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'
AND created_at > NOW() - INTERVAL '1 day'
GROUP BY ip_address
ORDER BY COUNT(*) DESC;
```

**Users denied admin access**:
```sql
SELECT DISTINCT user_id, email, COUNT(*)
FROM audit_logs
WHERE action = 'ROUTE_ACCESS_DENIED'
AND required_role = 'admin'
GROUP BY user_id, email
ORDER BY COUNT(*) DESC;
```

**Suspicious repeated failed attempts from IP**:
```sql
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
AND action IN ('UNAUTHORIZED_ACCESS_ATTEMPT', 'ROUTE_ACCESS_DENIED')
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY attempts DESC;
```

## Security Monitoring Best Practices

1. **Monitor Failed Logins**: Track repeated `UNAUTHORIZED_ACCESS_ATTEMPT` from the same IP
2. **Privilege Escalation Attempts**: Alert on repeated `ROUTE_ACCESS_DENIED` with `required_role = 'admin'`
3. **Geographic Anomalies**: Correlate IP addresses with user login locations
4. **Compliance Audits**: Export audit logs regularly for compliance reports
5. **Alerting**: Set up database triggers or monitoring to alert on suspicious patterns

## Architecture

```
Request → EnsureAuthenticated Middleware
         ↓ (logs if 401)
         → Audit Service
         ↓
         → Audit Repository
         ↓
         → PostgreSQL (AuditLog table)

For role-based routes:
Request → RequireRole Middleware
         ↓ (logs if 403)
         → Audit Service
         ↓
         → Audit Repository
         ↓
         → PostgreSQL (AuditLog table)
```

## Implementation Notes

- Audit logs are written **synchronously** but errors are non-blocking (request flow continues if logging fails)
- Logs are created with server-side timestamps for consistent auditing
- Client IP extraction handles multiple proxy layers via `X-Forwarded-For` header
- All logs are tenant-scoped for multi-tenant safety
- Indexes on `user_id`, `action`, `resource`, `ip_address`, and `created_at` enable fast queries

