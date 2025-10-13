import fs from 'fs';
import crypto from 'crypto';

const loadKey = (pathEnv, b64Env, defaultPath) => {
    try {
        if (process.env[b64Env]) {
            return Buffer.from(process.env[b64Env], 'base64').toString('utf8');
        }
        const p = process.env[pathEnv] ?? defaultPath;
        return fs.readFileSync(p, 'utf8');
    } catch (err) {
        console.error(`Failed to load key (env ${pathEnv}/${b64Env}) - ${err.message}`);
        return null;
    }
};

const PRIVATE_KEY = loadKey('PRIVATE_KEY_PATH', 'PRIVATE_KEY_B64', 'keys/private.pem');
const PUBLIC_KEY = loadKey('PUBLIC_KEY_PATH', 'PUBLIC_KEY_B64', 'keys/public.pem');

const fingerprint = (s) => s ? crypto.createHash('sha256').update(s).digest('hex') : 'n/a';
const info = (label, s) => {
    if (!s) {
        console.log(`${label}: [NOT LOADED]`);
        return;
    }
    const lines = s.split(/\r?\n/).length;
    console.log(`${label}: [REDACTED] length=${s.length} chars, lines=${lines}, sha256=${fingerprint(s)}`);
};

info('PRIVATE_KEY', PRIVATE_KEY);
info('PUBLIC_KEY', PUBLIC_KEY);