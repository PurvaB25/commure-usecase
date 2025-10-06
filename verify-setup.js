#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying Replit Setup...\n');

const checks = [
  {
    name: 'Git Repository',
    test: () => existsSync('.git'),
    message: 'Git repository initialized'
  },
  {
    name: '.gitignore',
    test: () => existsSync('.gitignore'),
    message: 'Gitignore file created'
  },
  {
    name: 'Replit Config',
    test: () => existsSync('.replit'),
    message: 'Replit configuration file created'
  },
  {
    name: 'Nix Config',
    test: () => existsSync('replit.nix'),
    message: 'Nix configuration file created'
  },
  {
    name: 'Root package.json',
    test: () => existsSync('package.json'),
    message: 'Root package.json created'
  },
  {
    name: 'Server Startup Script',
    test: () => existsSync('start-servers.js'),
    message: 'Server startup script created'
  },
  {
    name: 'Server package.json',
    test: () => existsSync('server/package.json'),
    message: 'Server package.json exists'
  },
  {
    name: 'Frontend package.json',
    test: () => existsSync('utilization-agent/package.json'),
    message: 'Frontend package.json exists'
  },
  {
    name: 'Server .env.example',
    test: () => existsSync('server/.env.example'),
    message: 'Server environment template created'
  },
  {
    name: 'Frontend .env.example',
    test: () => existsSync('utilization-agent/.env.example'),
    message: 'Frontend environment template created'
  },
  {
    name: 'Deployment Guide',
    test: () => existsSync('REPLIT_DEPLOYMENT.md'),
    message: 'Deployment documentation created'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const result = check.test();
  const icon = result ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.message}`);

  if (result) {
    passed++;
  } else {
    failed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✨ All checks passed! Your project is ready for Replit deployment.\n');
  console.log('📝 Next steps:');
  console.log('   1. Review REPLIT_DEPLOYMENT.md for deployment instructions');
  console.log('   2. Commit your changes: git add . && git commit -m "Configure for Replit"');
  console.log('   3. Push to GitHub (optional): git remote add origin <url> && git push');
  console.log('   4. Import to Replit from GitHub or upload files directly');
  console.log('   5. Configure environment variables in Replit Secrets');
  console.log('   6. Click Run!\n');
} else {
  console.log('⚠️  Some checks failed. Please review the missing files.\n');
  process.exit(1);
}
