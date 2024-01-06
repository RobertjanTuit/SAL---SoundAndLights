import EventEmitter2 from 'eventemitter2';
import fs from 'fs';
import { OS2LClient } from '../OS2L/OS2L-client.js';
import { eventNames } from '../OS2L/OS2L-constants.js';
import { Logger } from '../core/Logger.js';
import { applySnapshot } from 'mobx-state-tree';

export class SoundSwitchClient extends EventEmitter2 {
  os2lClient = null;
  statusStore = null;
  logger = new Logger('SoundSwitch');

  constructor (statusStore, options) {
    super({ wildcard: true, ignoreErrors: true });
    this.statusStore = statusStore;
    this.os2lClient = new OS2LClient(options);
    this.os2lClient.on('*', (data) => {
      switch (this.os2lClient.event) {
        case eventNames.closed:
          if (this.connected) {
            this.connected = false;
            this.logger.log(`closed.`);
            applySnapshot(statusStore, { ...statusStore, soundSwitchOS2L: false });
            this.emit('closed');
            setTimeout(() => this.connect(true), 2000);
          }
          break;
        case eventNames.discover:
          this.logger.log(`^ydiscovering`);
          break;
        case eventNames.discovered:
          this.logger.log(`discovered @ ^g${data}`);
          break;
        case eventNames.connecting:
          this.logger.log(`connecting @ ^g${data}`);
          break;
        case eventNames.connected:
          this.connected = true;
          this.emit('connected');
          applySnapshot(statusStore, { ...statusStore, soundSwitchOS2L: true });
          this.logger.log(`connected @ ^g${data}`);
          break;
        case eventNames.data:
          this.emit('data', data);
          fs.writeFileSync('soundswitch-data.json', JSON.stringify(data, null, 2));
          break;
        case eventNames.error:
          this.logger.log(`^rERROR: ^w${data}`);
          break;
        default:
          this.logger.log(`^g${this.os2lClient.event} ^w${data != null ? JSON.stringify(data).substring(0, 50) : ''}`);
          break;
      }
    });
  }

  send (data) {
    this.os2lClient.send(data);
  }

  connect (fromTimer = false) {
    this.logger.log(`Connecting ${fromTimer}`);
    this.os2lClient.connect();
  }

  close () {
    this.os2lClient.close();
  }
}
