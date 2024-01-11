import { watch } from 'fs';
import { Logger } from './Logger.js';
export default (settings, program, callback) => {
  if (settings.quitOnSrcChange) {
    let changeTimeout = null;
    const logger = new Logger('quitOnSrcChange');

    function watchPathOrFile (path) {
      watch(path, { recursive: true }, () => {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(async () => {
          if (callback) await callback();
          program.quit();
          console.log('Quiting because files changed...');
        }, 100);
      }).on('error', (error) => {
        logger.log(`Error watching ^b${path}^w | ^r${error}`);
      });
    }

    watchPathOrFile('src');
    watchPathOrFile('config');
    watchPathOrFile('package.json');
  }
};
