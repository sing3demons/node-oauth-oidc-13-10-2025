# OAuth 2.0 + PKCE Example with Node.js

ตัวอย่างการ implement OAuth 2.0 Authorization Code Flow พร้อม PKCE (Proof Key for Code Exchange) โดยใช้ Node.js

## โครงสร้างโปรเจค

```
├── client/
│   ├── client.js         # OAuth Client (Port 3000)
│   ├── package.json
│   └── pnpm-lock.yaml
├── server/
│   ├── auth-server.js    # OAuth Authorization Server (Port 4000)
│   ├── package.json
│   └── pnpm-lock.yaml
└── README.md
```

## Features

- **OAuth 2.0 Authorization Code Flow** with PKCE
- **Public Client** (ไม่ใช้ client_secret)
- **PKCE Implementation** (code_challenge / code_verifier)
- **JWT Token** generation และ verification
- **State parameter** สำหรับป้องกัน CSRF attacks
- **RS256 Signature** สำหรับ JWT tokens

## การติดตั้ง

### 1. Clone repository

```bash
git clone <repository-url>
cd ex1-node-oauth
```

### 2. ติดตั้ง dependencies

#### สำหรับ Auth Server
```bash
cd server
pnpm install
```

#### สำหรับ Client
```bash
cd client
pnpm install
```

## วิธีรัน (ครบทั้ง flow)

### 1. สร้างไฟล์ auth-server.js และ client.js ตามด้านบน

### 2. ติดตั้ง dependencies ตามที่บอกข้างต้น

### 3. เปิดเทอร์มินัล 2 ตัว:

#### Terminal 1: รัน Auth Server
```bash
cd server
node auth-server.js
```
→ Auth server บน http://localhost:4000

#### Terminal 2: รัน Client
```bash
cd client  
node client.js
```
→ Client บน http://localhost:3000

### 4. เปิดเบราว์เซอร์ ไปที่:
```
http://localhost:3000/login
```

**Flow การทำงาน:**
1. จะ redirect ไปหน้า login ของ auth server
2. ใส่ `alice` / `password` 
3. จะ redirect กลับ client `/callback` แลก token ด้วย `code_verifier`
4. แสดง payload ของ `id_token`

## สิ่งที่ต้องสังเกตเมื่อดูตัวอย่างนี้

### 🔐 Security Features

- **Client ไม่ส่ง client_secret** (public client) — แทนด้วย PKCE (code_challenge / code_verifier)
- **Authorization Code ใช้ได้ครั้งเดียว** และผูกกับ code_challenge
- **การแลก token ต้องส่ง code_verifier** ที่ match กับ code_challenge

### ⚠️ ใน Production ต้อง:

- ✅ **ใช้ HTTPS เสมอ**
- ✅ **เก็บ code_verifier ในวิธีที่ปลอดภัย** (ถ้าเป็น SPA เก็บใน memory ไม่ใช่ cookie httpOnly)
- ✅ **ตรวจ state อย่างเคร่งครัด**
- ✅ **ตรวจและ verify id_token ด้วย JWKS** (server ตัวอย่างใช้ RS256; client demo decode only — ต้อง verify จริง ๆ)

## API Endpoints

### Auth Server (Port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/authorize` | Authorization endpoint |
| POST | `/token` | Token endpoint |
| GET | `/login` | Login form |
| POST | `/login` | Login submission |
| GET | `/.well-known/jwks.json` | JWKS endpoint |

### Client (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/login` | เริ่มต้น OAuth flow |
| GET | `/callback` | OAuth callback handler |

## Dependencies

### Server Dependencies
- `express` - Web framework
- `jsonwebtoken` - JWT token handling
- `node-jose` - JOSE (JSON Web Signature) implementation
- `uuid` - Generate unique identifiers
- `body-parser` - Parse request bodies
- `cookie-parser` - Parse cookies
- `axios` - HTTP client

### Client Dependencies
- `express` - Web framework
- `axios` - HTTP client
- `jsonwebtoken` - JWT token decoding
- `node-jose` - JOSE implementation
- `body-parser` - Parse request bodies
- `cookie-parser` - Parse cookies

## การทำงานของ PKCE

1. **Client สร้าง code_verifier** (random string)
2. **Client สร้าง code_challenge** จาก code_verifier (SHA256 hash แล้ว base64url encode)
3. **Client ส่ง code_challenge ไปกับ authorization request**
4. **Authorization Server เก็บ code_challenge ผูกกับ authorization code**
5. **Client แลก authorization code + code_verifier เป็น access token**
6. **Authorization Server verify ว่า code_verifier match กับ code_challenge**

## Test Credentials

- **Username:** `alice`
- **Password:** `password`

## License

MIT License