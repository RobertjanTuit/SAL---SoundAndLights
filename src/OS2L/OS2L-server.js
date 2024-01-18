import net from 'net';
import EventEmitter2 from 'eventemitter2';
import bonjour from 'bonjour';
import { names, messages, eventNames } from './OS2L-constants.js';
import { Logger } from '../core/Logger.js';

/**
 * The OS2LServer handles incoming commands. Usally this is part of a DMX Software.
 */
export class OS2LServer extends EventEmitter2 {
  logger = new Logger('OS2LServer');
  /**
   * Creates an instance of an OS2LServer
   * @param {Object} options Options object
   */
  constructor (port = 1503, host = '127.0.0.1', doPublish = true) {
    super({ wildcard: true, ignoreErrors: true });

    // Option parameters
    this.port = port;
    this.host = host;
    this.doPublish = doPublish;

    // Other attributes
    this.net = null;
    this.clients = [];
  }

  /**
   * Starts listening
   * @param {Function} [callback] Is called when the server started listening.
   */
  start (callback = null) {
    // this.logger.log(`Starting OS2L Server on port ${this.port}`);
    return new Promise((resolve, reject) => {
      if (this.net) {
        const err = new Error();
        this.emit(eventNames.error, messages.cantStartAlreadyRunning);
        reject(err);
        return;
      }

      this.createNetServer();

      this.handleEvents(reject);

      this.netListen(callback, resolve);

      this.emit(eventNames.listening, this.port);

      if (this.doPublish) {
        bonjour().unpublishAll();
        this.service = bonjour().publish({
          name: names.os2l,
          type: names.os2l,
          port: this.port,
          host: this.host
        });
        this.emit(eventNames.published, this.host + ':' + this.port);
      }

      this.emit(eventNames.started);
    });
  }

  netListen (callback, resolve) {
    this.net.listen(this.port, this.host, () => {
      if (callback) {
        callback();
      }
      resolve();
    });
  }

  handleEvents (reject) {
    this.net.on(eventNames.error, msg => {
      this.logger.log('^rOS2L: ^w' + msg);
      this.emit(eventNames.error, msg);
      reject(msg);
    });
    this.net.on('close', msg => {
      this.logger.log('^rOS2L close: ^w' + msg);
      reject(msg);
    });
    this.net.on('listening', msg => {
      this.logger.log('^rOS2L listening: ^w' + JSON.stringify(this.net.address()));
      reject(msg);
    });
    this.net.on('drop', msg => {
      this.logger.log('^rOS2L drop: ^w' + msg);
      reject(msg);
    });
    this.net.on('connection', msg => {
      this.logger.log('^rOS2L connection: ^w' + JSON.stringify(msg.address()));
      reject(msg);
    });
  }

  createNetServer () {
    this.net = net.createServer((client) => {
      this.clients.push(client);
      client.bufferStr = '';

      this.emit(eventNames.connected);

      this.handleClientErrors(client);

      this.handleClientData(client);

      client.on(eventNames.end, () => {
        this.emit(eventNames.disconnected, client);
        const index = this.clients.indexOf(client);
        if (index >= 0) {
          this.clients.splice(index, 1);
        }
      });
    });
  }

  dataError (data) {
    this.emit(eventNames.debug, { start: data.substr(0, 10), end: data.substr(data.length - 10, 10) });
  }

  handleClientData (client) {
    client.on(eventNames.data, data => {
      let str = data.toString();
      const startStr = str.substr(0, 1);
      const endStr = str.substr(data.length - 1);
      if (startStr === '[' && endStr === ']') {
        str = str.substr(1, str.length - 2);
      }

      if (endStr !== '}') {
        client.bufferStr += str;
        return;
      }

      if (startStr !== '{') {
        str = client.bufferStr + str;
        client.bufferStr = '';
      }

      const fixedStr = '[' + str.replaceAll(/}\s*{/g, '},{') + ']';
      try {
        const items = JSON.parse(fixedStr);
        for (const item of items) {
          this.emit(eventNames.data, item);
        }
      } catch (e) {
        this.dataError(fixedStr);
      }

      // const allItems = data.toString().split('\n');
      // try {
      //   const items = JSON.parse('[' + fixedStr + ']');
      //   parsedItems.push(...items);
      // } catch (e) {
      //   this.emit(eventNames.error, fixedStr);
      // }

      // if (parsedItems && parsedItems.length) {
      //   parsedItems.forEach(parsed => {
      //     this.emit(eventNames.data, parsed);
      //   });
      // }
    });
  }

  handleClientErrors (client) {
    client.on(eventNames.error, () => {
      client.destroy();
      const index = this.clients.indexOf(client);
      if (index >= 0) {
        this.clients.splice(index, 1);
      }
    });
  }

  stop () {
    if (!this.net) {
      this.emit(eventNames.error, new Error(messages.cantCloseNotRunning));
      return;
    }
    this.net.close();
    this.net.unref();
    this.net = null;

    this.service.stop();
    this.service = null;

    this.emit(eventNames.closed);
  }

  send (data) {
    const json = JSON.stringify(data, null, 0);
    for (const client of this.clients) {
      client.write(json);
    }
  }

  on (...args) {
    super.on(...args);
  }
}
