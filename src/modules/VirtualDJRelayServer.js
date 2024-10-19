import net from 'net';
import { Logger } from '../core/Logger.js';
import EventEmitter2 from 'eventemitter2';

export class VirtualDJRelayServer extends EventEmitter2 {
  logger = new Logger('VirtualDJRelayServer');
  constructor ({ port = 1604, host = '127.0.0.1', virtualDJServer }) {
    super({ wildcard: true, ignoreErrors: true });
    this.port = port;
    this.host = host;
    this.net = null;
    this.clients = [];
    this.virtualDJServer = virtualDJServer;
    this.virtualDJServer.on('data', (data) => {
      this.send(data);
    });
  }

  async start () {
    this.net = net.createServer((client) => {
      this.clients.push(client);
      this.logger.log(`Client connected: ${client.remoteAddress}:${client.remotePort}`);
      for (const key in this.lastState) {
        client.write(JSON.stringify(this.lastState[key], null, 0));
      }
      client.on('error', () => {
        client.destroy();
        this.logger.log(`Client connection reset: ${client.remoteAddress}:${client.remotePort}`);
        const index = this.clients.indexOf(client);
        if (index >= 0) {
          this.clients.splice(index, 1);
        }
      });

      client.on('end', () => {
        this.emit('disconnected', client);
        this.logger.log(`Client disconnected: ${client.remoteAddress}:${client.remotePort}`);
        const index = this.clients.indexOf(client);
        if (index >= 0) {
          this.clients.splice(index, 1);
        }
      });
    });

    this.logger.log(`Listening on ${this.host}:${this.port} for Salut to connect`);
    this.net.listen(this.port, this.host, () => {
      this.emit('listening', this.port);
    });
  }

  lastState = {};
  send (data) {
    if (data.trigger) {
      this.lastState[data.trigger] = data;
    }
    const json = JSON.stringify(data, null, 0);
    for (const client of this.clients) {
      client.write(json);
    }
  }
}
