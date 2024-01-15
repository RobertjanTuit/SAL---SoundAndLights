import { applySnapshot } from 'mobx-state-tree';
import { Logger } from '../core/Logger.js';
import { eventNames } from '../OS2L/OS2L-constants.js';
import { OS2LServer } from '../OS2L/OS2L-server.js';
import EventEmitter2 from 'eventemitter2';

export class VirtualDJServer extends EventEmitter2 {
  logger = new Logger('VirtualDJServer');
  constructor (statusStore, options = { port: 4444, host: '127.0.0.1' }) {
    super({ wildcard: true, ignoreErrors: true });
    this.statusStore = statusStore;
    this.os2lServer = new OS2LServer(options.port, options.host);
    this.os2lServer.on('*', (data) => {
      switch (this.os2lServer.event) {
        case eventNames.error:
          if (this.connected) {
            this.logger.log(`^rError ^w${JSON.stringify(data)}`);
          }
          break;
        case eventNames.listening:
          this.logger.log(`^ylistening^w on port ^g${data}`);
          break;
        case eventNames.connected:
          this.connected = true;
          this.logger.log(`^gconnected`);
          applySnapshot(statusStore, { ...statusStore, virtualDJOS2L: true });
          this.emit(eventNames.connected);
          break;
        case eventNames.data:
          this.emit(eventNames.data, data);
          // this.logger.log(`^bOS2LServer^w data: ^g${JSON.stringify(data).substring(0, 200)}`);
          break;
        case eventNames.published:
          this.logger.log(`BonJour Published for port ^g${JSON.stringify(data)}`);
          break;
        case eventNames.disconnected:
          this.connected = false;
          this.logger.log(`^rdisconnected`);
          applySnapshot(statusStore, { ...statusStore, virtualDJOS2L: false });
          this.emit(eventNames.disconnected);
          break;
        default:
          this.logger.log(`^g${this.os2lServer.event} ^w${data != null ? JSON.stringify(data, null, 2) : ''}`);
          break;
      }
    });
  }

  async send (data) {
    this.os2lServer.send(data);
  }

  async start () {
    try {
      await this.os2lServer.start();
    } catch (err) { /* ignore */ }
  }

  async stop () {
    this.os2lServer.stop();
  }
}
