#!/usr/bin/env node

/**
 * Migration script to backup old JavaScript files and switch to TypeScript
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToBackup = [
    'auth-server.js',
    'logMiddleware.js'
];

console.log('🔄 Starting migration to TypeScript...');

// Create backup directory
const backupDir = path.join(__dirname, 'backup-js');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
    console.log('📁 Created backup directory: backup-js/');
}

// Backup old files
filesToBackup.forEach(file => {
    const sourcePath = path.join(__dirname, file);
    const backupPath = path.join(backupDir, file);
    
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`✅ Backed up: ${file} -> backup-js/${file}`);
    }
});

console.log('\n🎉 Migration completed!');
console.log('\n📋 Next steps:');
console.log('1. Build the TypeScript project: npm run build');
console.log('2. Seed the database: npm run seed');
console.log('3. Start development server: npm run dev');
console.log('4. Test the production build: npm start');
console.log('\n🗑️  Old JavaScript files are backed up in backup-js/ directory');
console.log('   You can safely remove them once you verify the TypeScript version works.');