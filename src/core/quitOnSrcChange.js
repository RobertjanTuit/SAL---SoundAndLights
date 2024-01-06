import { watch } from 'fs';
export default (settings, program, callback) => {
  if (settings.quitOnSrcChange) {
    let changeTimeout = null;

    const onChangeEvent = () => {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(async () => {
        if (callback) await callback();
        program.quit();
        console.log('Quiting because files changed...');
      }, 100);
    };

    watch('src', { recursive: true }, onChangeEvent);
    watch('config', { recursive: true }, onChangeEvent);
    watch('package.json', { recursive: true }, onChangeEvent);
  }
};
