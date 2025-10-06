import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start backend server
const backend = spawn('npm', ['start'], {
  cwd: join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

// Start frontend server (preview mode for production)
const frontend = spawn('npm', ['run', 'preview'], {
  cwd: join(__dirname, 'utilization-agent'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
  frontend.kill();
  process.exit(code);
});

frontend.on('exit', (code) => {
  console.log(`Frontend exited with code ${code}`);
  backend.kill();
  process.exit(code);
});

console.log('Starting Commure Pulse servers...');
console.log('Backend: http://localhost:3001');
console.log('Frontend: http://localhost:5000');
