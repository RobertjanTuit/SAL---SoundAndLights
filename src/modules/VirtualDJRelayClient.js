import net from 'net';
import { Logger } from '../core/Logger.js';
import EventEmitter2 from 'eventemitter2';
export class VirtualDJRelayClient extends EventEmitter2 {
  logger = new Logger('VirtualDJRelayCLient');
  constructor ({ port = 1604, host = '127.0.0.1' }) {
    super({ wildcard: true, ignoreErrors: true });
    this.port = port;
    this.host = host;
    this.net = null;
    this.client = null;
  }

  start () {
    this.client = new net.Socket();
    this.client.on('close', () => {
      this.tryConnect();
    });
    this.client.on('connect', () => {
      this.logger.log(`Connected to ${this.host}:${this.port}`);
    });
    this.client.on('error', () => {
      this.logger.error(`Error connecting to ${this.host}:${this.port}`);
      this.tryConnect();
    });
    this.client.on('data', data => {
      try {
        const parsedData = JSON.parse('[' + data.toString('utf8').replaceAll('}{', '},{') + ']');
        this.emit('data', parsedData);
      } catch (e) {
        this.emit('error', e);
      }
    });
    this.logger.log(`Connecting to ${this.host}:${this.port}`);
    this.tryConnect(0);
  }

  tryConnect (delay = 1000) {
    clearTimeout(this.connectInterval);
    this.connectInterval = setTimeout(() => {
      this.client.connect(this.port, this.host);
    }, delay);
  }
}
