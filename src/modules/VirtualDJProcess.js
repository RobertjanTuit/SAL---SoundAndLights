import { Logger } from '../core/Logger.js';
import { ProcessManager } from '../core/ProcessManager.js';
import { VirtualDJMidi as VirtualDJMidiController } from './VirtualDJMidiController.js';

import config from 'config';

export async function virtualDJProcess () {
  const appsConfig = config.get('apps');

  const virtualDJMidiController = new VirtualDJMidiController({ midiDeviceName: appsConfig.virtualDJ.midiDeviceName, midiMappings: appsConfig.virtualDJ.midiMappings, midiDebugNote: appsConfig.virtualDJ.midiDebugNote, logDetail: appsConfig.virtualDJ.midiLogDetail });
  const processManager = new ProcessManager({ appsConfig, virtualDJMidiController });

  const logger = new Logger('VirtualDJProcess');

  processManager.start();
  logger.log('Checking if VirtualDJ is running');
  if (processManager.isRunning.virtualDJ) {
    logger.log('Stopping existing running VirtualDJ');
    await processManager.killProcess('virtualDJ');
  } else {
    logger.log('Starting VirtualDJ');
    processManager.startProcess('virtualDJ');
  }
  processManager.on('running', (app) => {
    logger.log(`^rStarted: ^w${app}`);
  });

  processManager.on('notrunning', (app) => {
    logger.log(`^rStopped: ^w${app}`);
    if (app === 'virtualDJ') {
      setTimeout(() => {
        logger.log('Starting VirtualDJ');
        processManager.startProcess('virtualDJ');
      }, 1000);
    }
  });
}
