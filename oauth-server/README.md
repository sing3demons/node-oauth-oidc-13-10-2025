# OAuth Server TypeScript

OAuth 2.0 + OpenID Connect server implementation in TypeScript with Node.js, Express, and MongoDB.

## Features

- 🔐 OAuth 2.0 Authorization Code Flow with PKCE
- 🆔 OpenID Connect ID Token support  
- 🔑 RSA256 signed JWT tokens
- 📊 Request/Response logging with trace IDs
- 🏗️ TypeScript for type safety
- 🔄 Refresh token support
- 🔍 Auto-discovery endpoints

## Prerequisites

- Node.js 18+ 
- MongoDB
- RSA Key pair (in `keys/` directory)

## Installation

```bash
npm install
```

## Development Setup

1. **Generate RSA Keys** (if not exists):
   ```bash
   mkdir -p keys
   openssl genrsa -out keys/private.pem 2048
   openssl rsa -in keys/private.pem -outform PEM -pubout -out keys/public.pem
   ```

2. **Seed Database**:
   ```bash
   npm run seed
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Production Build

```bash
npm run build
npm start
```

## API Endpoints

### OpenID Connect Discovery
- `GET /.well-known/openid-configuration` - Discovery document
- `GET /.well-known/jwks.json` - JSON Web Key Set

### OAuth 2.0 Flow  
- `GET /authorize` - Authorization endpoint (with PKCE)
- `POST /login` - User authentication
- `POST /token` - Token endpoint (authorization_code & refresh_token)
- `GET /userinfo` - User information endpoint
- `POST /revoke` - Token revocation

## Environment Variables

- `MONGO` - MongoDB connection string (default: `mongodb://localhost:27017/oauth_demo`)
- `PORT` - Server port (default: `4000`)
- `SERVICE_NAME` - Service name for logging
- `SERVICE_VERSION` - Service version for logging

## Demo Credentials

After seeding the database:
- Username: `alice`
- Password: `password`
- Client ID: `spa-client`

## TypeScript Configuration

The project uses strict TypeScript configuration with:
- ES2022 target
- ESNext modules
- Strict type checking
- Path mapping for imports
- Source maps for debugging

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run seed` - Seed database with demo data

## Project Structure

```
src/
├── index.ts          # Main server file
├── middleware.ts     # Express middleware
├── seed.ts          # Database seeding
├── models/          # Mongoose models
│   └── index.ts
└── types/           # TypeScript type definitions
    └── index.ts
```

## Security Features

- PKCE (Proof Key for Code Exchange) required
- RSA256 signed JWT tokens
- Secure token storage
- Request/response logging with trace IDs
- Input validation and sanitization


## create key pair

```bash
mkdir keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```
