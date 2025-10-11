# OAuth Server - Clean Architecture

## 🏗️ Architecture Overview

The OAuth server has been redesigned following **Clean Architecture** principles with clear separation of concerns:

```
src/
├── 📁 config/           # Configuration management
├── 📁 controllers/      # HTTP request handlers
├── 📁 services/        # Business logic layer
├── 📁 models/          # Data models (MongoDB)
├── 📁 routes/          # Route definitions
├── 📁 types/           # TypeScript type definitions
├── 📁 utils/           # Helper utilities
├── 📁 middleware/      # Express middleware
├── 📄 app.ts           # Application class
└── 📄 main.ts          # Entry point
```

## 🔧 Key Components

### Configuration Layer (`config/`)
- **Environment management**: All configs centralized
- **Type-safe configuration**: Strongly typed config object
- **Environment variables**: Easy to override settings

### Service Layer (`services/`)
- **AuthService**: Core OAuth business logic
- **CryptoService**: JWT signing, PKCE validation
- **DatabaseService**: MongoDB connection management

### Controller Layer (`controllers/`)
- **AuthController**: Authorization endpoints
- **TokenController**: Token issuance/refresh
- **UserController**: User information endpoints
- **DiscoveryController**: OIDC discovery endpoints

### Models Layer (`models/`)
- **User, Client, AuthCode, RefreshToken**: MongoDB schemas
- **Type-safe**: Full TypeScript integration

## 🚀 Features

### OAuth 2.0 + OpenID Connect
- ✅ Authorization Code Flow with PKCE
- ✅ Refresh Token support
- ✅ ID Token (OpenID Connect)
- ✅ Auto-discovery endpoints
- ✅ JWKS endpoint

### Security
- 🔐 RSA256 JWT signing
- 🛡️ PKCE validation
- 🚫 Secure token storage
- 🔍 Request tracing

### Development Experience
- 📝 Full TypeScript support
- 🎯 Clean Architecture
- 🔄 Hot reload with tsx
- 📊 Structured logging
- ✨ Graceful shutdown

## 📊 Flow Diagram

```mermaid
graph TD
    A[Client App] --> B[/authorize]
    B --> C[Login Form]
    C --> D[/login]
    D --> E[Auth Code]
    E --> A
    A --> F[/token]
    F --> G[Access Token + ID Token]
    G --> H[/userinfo]
```

## 🔄 Dependency Flow

```
main.ts → app.ts → routes → controllers → services → models
```

- **main.ts**: Application bootstrap
- **app.ts**: Express app setup
- **routes**: HTTP routing
- **controllers**: Request handling
- **services**: Business logic
- **models**: Data persistence

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start with hot reload

# Production
pnpm build            # Compile TypeScript
pnpm start            # Run compiled version

# Database
pnpm seed             # Seed demo data

# Legacy (old structure)
pnpm dev:legacy       # Run old index.ts
```

## ⚡ Performance & Scalability

### Singleton Pattern
- Services use singleton pattern for resource efficiency
- Single database connection pool
- Shared crypto service instance

### Resource Management
- Graceful shutdown handling
- Connection pooling
- Memory-efficient JWT operations

### Error Handling
- Centralized error responses
- Proper HTTP status codes
- Detailed error logging

## 🧪 Testing Strategy

```
tests/
├── unit/           # Unit tests for services
├── integration/    # API endpoint tests
└── e2e/           # End-to-end OAuth flows
```

## 🔒 Security Considerations

1. **PKCE Required**: All authorization flows must use PKCE
2. **Secure Headers**: CORS, CSP properly configured
3. **Token Security**: Refresh token rotation
4. **Input Validation**: All inputs validated
5. **Rate Limiting**: TODO - Add rate limiting middleware

## 📈 Monitoring & Observability

- **Request ID Tracing**: Every request has unique trace ID
- **Structured Logging**: JSON formatted logs
- **Health Endpoint**: `/health` for monitoring
- **Performance Metrics**: TODO - Add metrics collection