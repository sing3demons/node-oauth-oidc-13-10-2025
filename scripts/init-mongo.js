// MongoDB Initialization Script
// This script runs automatically when MongoDB container starts for the first time

print('============================================');
print('Starting OAuth 2.0 Database Initialization');
print('============================================');

// Switch to oauth2 database
db = db.getSiblingDB('oauth2');

// Create collections with validators and indexes
print('\n1. Creating collections with validators...');

// Users Collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'username', 'password', 'email'],
      properties: {
        id: {
          bsonType: 'string',
          description: 'User ID - required'
        },
        username: {
          bsonType: 'string',
          description: 'Username - required'
        },
        password: {
          bsonType: 'string',
          description: 'Hashed password - required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Email address - required'
        }
      }
    }
  }
});

// Clients Collection
db.createCollection('clients', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'secret', 'name', 'redirectUris', 'grants'],
      properties: {
        id: {
          bsonType: 'string',
          description: 'Client ID - required'
        },
        secret: {
          bsonType: 'string',
          description: 'Client secret - required'
        },
        name: {
          bsonType: 'string',
          description: 'Client name - required'
        },
        redirectUris: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Redirect URIs - required'
        },
        grants: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            enum: ['authorization_code', 'client_credentials', 'refresh_token', 'password']
          },
          description: 'Grant types - required'
        },
        accessTokenLifetime: {
          bsonType: 'int',
          description: 'Access token lifetime in seconds'
        },
        refreshTokenLifetime: {
          bsonType: 'int',
          description: 'Refresh token lifetime in seconds'
        }
      }
    }
  }
});

// Tokens Collection
db.createCollection('tokens', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['accessToken', 'accessTokenExpiresAt', 'client', 'user'],
      properties: {
        accessToken: {
          bsonType: 'string',
          description: 'Access token - required'
        },
        accessTokenExpiresAt: {
          bsonType: 'date',
          description: 'Access token expiration - required'
        },
        refreshToken: {
          bsonType: 'string',
          description: 'Refresh token - optional'
        },
        refreshTokenExpiresAt: {
          bsonType: 'date',
          description: 'Refresh token expiration - optional'
        },
        scope: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Scopes - optional'
        },
        idToken: {
          bsonType: 'string',
          description: 'OpenID Connect ID Token - optional'
        }
      }
    }
  }
});

// Authorization Codes Collection
db.createCollection('authorization_codes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['code', 'expiresAt', 'redirectUri', 'client', 'user'],
      properties: {
        code: {
          bsonType: 'string',
          description: 'Authorization code - required'
        },
        expiresAt: {
          bsonType: 'date',
          description: 'Expiration date - required'
        },
        redirectUri: {
          bsonType: 'string',
          description: 'Redirect URI - required'
        },
        scope: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Scopes - optional'
        },
        codeChallenge: {
          bsonType: 'string',
          description: 'PKCE code challenge - optional'
        },
        codeChallengeMethod: {
          bsonType: 'string',
          enum: ['S256', 'plain'],
          description: 'PKCE challenge method - optional'
        },
        nonce: {
          bsonType: 'string',
          description: 'OpenID Connect nonce - optional'
        }
      }
    }
  }
});

// OAuth Sessions Collection (30 minute expiry)
db.createCollection('oauth_sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'clientId', 'redirectUri', 'responseType', 'createdAt', 'expiresAt'],
      properties: {
        sessionId: {
          bsonType: 'string',
          description: 'Session UUID - required'
        },
        clientId: {
          bsonType: 'string',
          description: 'OAuth client ID - required'
        },
        redirectUri: {
          bsonType: 'string',
          description: 'Redirect URI - required'
        },
        responseType: {
          bsonType: 'string',
          description: 'OAuth response type - required'
        },
        scope: {
          bsonType: 'string',
          description: 'OAuth scopes - optional'
        },
        state: {
          bsonType: 'string',
          description: 'OAuth state parameter - optional'
        },
        codeChallenge: {
          bsonType: 'string',
          description: 'PKCE code challenge - optional'
        },
        codeChallengeMethod: {
          bsonType: 'string',
          enum: ['S256', 'plain'],
          description: 'PKCE challenge method - optional'
        },
        nonce: {
          bsonType: 'string',
          description: 'OpenID Connect nonce - optional'
        },
        traceId: {
          bsonType: 'string',
          description: 'Trace ID for logging - optional'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Session creation time - required'
        },
        expiresAt: {
          bsonType: 'date',
          description: 'Session expiration time (30 minutes) - required'
        }
      }
    }
  }
});

print('✓ Collections created successfully');

// Create indexes
print('\n2. Creating indexes...');

// Users indexes
db.users.createIndex({ id: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
print('✓ Users indexes created');

// Clients indexes
db.clients.createIndex({ id: 1 }, { unique: true });
db.clients.createIndex({ name: 1 });
print('✓ Clients indexes created');

// Tokens indexes (with TTL for auto-cleanup)
db.tokens.createIndex({ accessToken: 1 }, { unique: true });
db.tokens.createIndex({ refreshToken: 1 }, { sparse: true });
db.tokens.createIndex({ accessTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
db.tokens.createIndex({ 'user.id': 1 });
db.tokens.createIndex({ 'client.id': 1 });
print('✓ Tokens indexes created with TTL');

// Authorization codes indexes (with TTL)
db.authorization_codes.createIndex({ code: 1 }, { unique: true });
db.authorization_codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.authorization_codes.createIndex({ 'user.id': 1 });
db.authorization_codes.createIndex({ 'client.id': 1 });
print('✓ Authorization codes indexes created with TTL');

// OAuth sessions indexes (with TTL - expires in 30 minutes)
db.oauth_sessions.createIndex({ sessionId: 1 }, { unique: true });
db.oauth_sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.oauth_sessions.createIndex({ clientId: 1 });
print('✓ OAuth sessions indexes created with TTL');

// Insert test data
print('\n3. Inserting test data...');

// Test user (password: "password" - bcrypt hashed)
db.users.insertOne({
  id: 'user-1',
  username: 'demo',
  password: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // password: "password"
  email: 'demo@example.com'
});

db.users.insertOne({
  id: 'user-2',
  username: 'admin',
  password: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // password: "password"
  email: 'admin@example.com'
});

print('✓ Test users created');
print('  - Username: demo, Password: password');
print('  - Username: admin, Password: password');

// Test OAuth client
db.clients.insertOne({
  id: 'test-client-1',
  secret: 'test-secret-1',
  name: 'Test Application',
  redirectUris: [
    'http://localhost:3001/callback',
    'http://localhost:3000/callback',
    'http://127.0.0.1:3001/callback'
  ],
  grants: ['authorization_code', 'refresh_token', 'password', 'client_credentials'],
  accessTokenLifetime: 3600,
  refreshTokenLifetime: 86400
});

db.clients.insertOne({
  id: 'spa-client-1',
  secret: 'spa-secret-1',
  name: 'SPA Application',
  redirectUris: [
    'http://localhost:3001/callback',
    'http://localhost:8080/callback'
  ],
  grants: ['authorization_code', 'refresh_token'],
  accessTokenLifetime: 3600,
  refreshTokenLifetime: 86400
});

print('✓ Test clients created');
print('  - Client ID: test-client-1, Secret: test-secret-1');
print('  - Client ID: spa-client-1, Secret: spa-secret-1');

// Create admin user (for database management)
print('\n4. Creating database admin user...');

db = db.getSiblingDB('admin');
db.createUser({
  user: 'oauth_admin',
  pwd: 'oauth_admin_pass_2024',
  roles: [
    { role: 'readWrite', db: 'oauth2' },
    { role: 'dbAdmin', db: 'oauth2' }
  ]
});

print('✓ Admin user created');
print('  - Username: oauth_admin');
print('  - Password: oauth_admin_pass_2024');

// Switch back to oauth2 database
db = db.getSiblingDB('oauth2');

// Display collection stats
print('\n5. Database Statistics:');
print('--------------------------------------------');
print('Database: ' + db.getName());
print('Collections: ' + db.getCollectionNames().length);
print('');

const collections = ['users', 'clients', 'tokens', 'authorization_codes'];
collections.forEach(function(collName) {
  const count = db[collName].countDocuments();
  print(collName + ': ' + count + ' documents');
});

print('');
print('============================================');
print('Initialization completed successfully! ✓');
print('============================================');
print('');
print('Connection string:');
print('mongodb://admin:password123@localhost:27017/oauth2?authSource=admin');
print('');
print('MongoDB Express UI:');
print('http://localhost:8081');
print('Username: admin, Password: admin123');
print('============================================');
