import EventEmitter2 from 'eventemitter2';
import { Logger } from '../core/Logger.js';
import OSCClient from '../OSC/OSCClient.js';

export class ResolumeOSCCLient extends EventEmitter2 {
  logger = new Logger('ResolumeOSC');
  constructor ({ port, host }) {
    super({ wildcard: true, ignoreErrors: true });
    this.port = port;
    this.host = host;
    this.oscClient = new OSCClient(this.host, this.port);
    this.oscClient.on('error', (err) => {
      this.logger.log('error' + err);
    });
    this.logger.log(`Starting OSCClient on ^g${this.port} @ ${this.host}`);
    setInterval(() => {
      try {
        this.send('ping');
      } catch (e) {
      }
    }, 2000);
  }

  close (...args) {
    this.oscClient.close();
  }

  send (...args) {
    this.oscClient.send(...args);
  }
}
