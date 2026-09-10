const { spawn } = require('child_process');
const fs = require('fs');

const out = fs.openSync('C:/Users/marci/Desktop/Nowy folder/dev_log.txt', 'a');
const err = fs.openSync('C:/Users/marci/Desktop/Nowy folder/dev_log.txt', 'a');

const p = spawn('npx.cmd', ['next', 'dev', '-p', '3000'], {
  cwd: 'C:/Users/marci/Desktop/Nowy folder',
  detached: true,
  stdio: [ 'ignore', out, err ]
});

p.unref();
console.log('Spawned Next.js dev server with PID:', p.pid);
