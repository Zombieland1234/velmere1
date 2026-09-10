const { spawn } = require('child_process');
const fs = require('fs');

const logFile = 'C:/Users/marci/Desktop/Nowy folder/dev_log.txt';
const out = fs.openSync(logFile, 'w');

const nextBin = 'C:/Users/marci/Desktop/Nowy folder/node_modules/next/dist/bin/next';

const p = spawn(process.execPath, [nextBin, 'dev', '-p', '3000'], {
  cwd: 'C:/Users/marci/Desktop/Nowy folder',
  detached: true,
  stdio: [ 'ignore', out, out ]
});

p.unref();
console.log('Successfully launched Next.js with PID:', p.pid);
