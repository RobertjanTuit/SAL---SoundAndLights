import nodemon from 'nodemon';
import { exec, execSync } from 'child_process';
import { windowManager } from 'node-window-manager';

exec('cls');
nodemon({
  exec: 'node src/index.js || exit 1',
  // exec: 'echo yes',
  ext: 'js',
  watch: ['src/', 'build/'],
  // spawn: true,
  delay: 500
});

nodemon.on('start', async () => {
  killAllSubs();
  setTimeout(() => {
    exec('"c:/Program Files/SoundSwitch/SoundSwitch.exe"');
    const minimizeInterval = setInterval(() => {
      windowManager.getWindows().forEach((window) => {
        if (window.getTitle() === 'SoundSwitch') {
          window.minimize();
          clearTimeout(minimizeInterval);
        }
      });
    }, 500);
    setTimeout(() => {
      exec('"c:/Program Files/VirtualDJ/virtualdj.exe"');
    }, 500);
  }, 500);
});/* .on('quit', () => {
  killAllSubs();
}).on('restart', () => {
  killAllSubs();
}); */

function killAllSubs () {
  try {
    execSync('taskkill /f /im virtualdj.exe', { ignoreErrors: true });
  } catch (e) {
    // ignore
  }
  try {
    execSync('taskkill /f /im SoundSwitch.exe', { ignoreErrors: true });
  } catch (e) {
    // ignore
  }
}
