import net from 'net';
import EventEmitter2 from 'eventemitter2';
import bonjour from 'bonjour';
import { eventNames, messages } from './OS2L-constants.js';

const optionsShouldBeAnObject = 'Expected an object for options!';
export class OS2LClient extends EventEmitter2 {
  constructor (options = {}) {
    super({ wildcard: true, ignoreErrors: true, ...options });

    this.port = 1504;
    this.host = 'localhost';
    this.useDNS_SD = true;

    if (typeof options !== 'object') throw new Error(optionsShouldBeAnObject);

    if ('port' in options) {
      this.port = Number(options.port);
    }

    if ('host' in options) {
      this.host = String(options.host);
    }

    if ('useDNS_SD' in options) {
      this.useDNS_SD = Boolean(options.useDNS_SD);
    }

    if ('autoReconnect' in options) {
      this.autoReconnect = Boolean(options.autoReconnect);
    }
    if ('tryInternal' in options) {
      this.tryInternal = Number(options.tryInternal);
    }

    // The TCP client
    this.client = null;
  }

  /**
   * Connects the client
   * @param {Function} callback Is called when a connection was made
   */
  connect (callback) {
    return new Promise((resolve, reject) => {
      function cb () {
        if (callback) callback();
        this.emit(eventNames.connected);
        resolve();
        this.connecting = false;
      }

      if (this.client) {
        this.emit(eventNames.error, messages.clientAlreadyConnected);
      }

      this.client = new net.Socket();
      this.client.on(eventNames.close, () => {
        this.closed();
      });
      this.client.on(eventNames.connect, () => {
        this.emit(eventNames.connected, `${this.host}:${this.port}`);
      });
      this.client.on(eventNames.error, err => {
        this.emit(eventNames.error, err);
        this.close();
      });
      this.client.on(eventNames.data, data => {
        try {
          const parsedData = JSON.parse(data.toString('utf8'));
          this.emit(eventNames.data, parsedData);
        } catch (e) {
          this.emit(eventNames.error, e);
        }
      });

      if (this.useDNS_SD) {
        this.emit(eventNames.discover, `${this.host}:${this.port}`);
        this._dnsSdFind((host, port) => {
          this.emit(eventNames.discovered, `${host}:${port}`);
          this.port = port;
          this.host = host;
          this.emit(eventNames.connecting, `${this.host}:${this.port}`);
          this.client.connect(this.port, this.host, cb);
        });
      } else {
        this.emit(eventNames.connecting, `${this.host}:${this.port}`);
        this.client.connect(this.port, this.host, cb);
      }
    });
  }

  close () {
    if (!this.client) {
      this.emit('error', new Error("Can't close OS2Client because it is not open!"));
      return;
    }

    this.closed();
  }

  closed () {
    if (this.client) {
      this.client.destroy();
      this.client.unref();
      this.client = null;
    }
    this.emit('closed');
  }

  send (object) {
    if (!this.client) return;
    let json;
    if (typeof object === 'string' || object instanceof Buffer) {
      json = object;
    } else {
      json = JSON.stringify(object, null, 0);
    }
    this.client.write(json);
  }

  _dnsSdFind (cb) {
    bonjour().findOne({ type: 'os2l' }, function (service) {
      cb(service.host, service.port);
    });
  }
}
