import EventEmitter2 from 'eventemitter2';
import WebSocket from 'isomorphic-ws';
import { ComplexLogger } from '../core/Logger.js';

export class ResolumeWebClient extends EventEmitter2 {
  subscribedParams = [];
  constructor ({ host, port, logDetail }) {
    super({ wildcard: true, ignoreErrors: true });
    this.host = host;
    this.port = port;
    this.logger = new ComplexLogger('ResolumeWeb', logDetail);
  }

  async start () {
    this.logger.log(`^bconnecting to ^gws://${this.host}:${this.port}`);
    this.tryConnect();
  }

  tryConnect () {
    clearTimeout(this.tryConnectTimeout);
    this.ws = new WebSocket(`ws://${this.host}:${this.port}/api/v1`);
    this.ws.onopen = () => {
      this.logger.log(`^gconnected`);
      this.open = true;
      this.emit('open');
    };
    this.ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type) {
        switch (data.type) {
          case 'parameter_subscribed':
            break;
          case 'parameter_update':
            break;
          case 'parameter_set':
            break;
          case 'parameter_get':
            break;
          case 'effects_update':
            break;
          case 'audio_update':
            break;
          case 'sources_update':
            break;
          default:
            this.logger.log(`message: [^r${data.type}:${ev.data.length}^w] ${ev.data.substring(0, 200)}`);
            break;
        }
      } else if (data.layers && data.columns) {
        // initial data of all: resolume-web-composition.json
        // this.composition = data;
        this.bpmId = data.tempocontroller.tempo.id;
        this.resyncId = data.tempocontroller.resync.id;
        this.logger.logDetail(`bpm.id: ${this.bpmId}`);
      } else {
        this.logger.log(`message: [:${ev.data.length}] ${ev.data.substring(0, 200)}`);
      }
      // this.emit('message', data.data.substring(0, 20));
    };
    this.ws.onerror = (error) => {
      if (this.open) {
        this.logger.log(`^rerror: ${JSON.stringify(error)}`);
        this.emit('error', error);
      }
    };
    this.ws.onclose = () => {
      if (this.open) {
        this.open = false;
        this.logger.log(`^yclosed ^gws://${this.host}:${this.port}`);
        this.emit('close');
      }
      this.tryConnectTimeout = setTimeout(() => {
        this.tryConnect();
      }, 1000);
    };
  }

  clipUrl (id, lastUpdated) {
    // is this the default clip (i.e. it has never been updated from its dummy
    if (lastUpdated === '0') {
      return `/api/v1/composition/thumbnail/dummy`;
    } else {
      return `/api/v1/composition/clips/by-id/${id}/thumbnail/${lastUpdated}`;
    }
  }

  resyncTimeout;
  resync () {
    if (this.resyncId) {
      this.action('trigger', this.resyncId, true);
      clearTimeout(this.resyncTimeout);
      this.resyncTimeout = setTimeout(() => {
        this.action('trigger', this.resyncId, false);
      }, 200);
    }
  }

  bpm (value) {
    if (this.bpmId) {
      this.action('set', this.bpmId, value);
    }
  }

  action (action, id, value = undefined) {
    const actionData = {
      action,
      parameter: '/parameter/by-id/' + id
    };
    if (value !== undefined) {
      actionData.value = value;
    }
    this.send(actionData);
  }

  get (param, value) {
    this.action('get', param, value);
  }

  set (param, value) {
    this.action('set', param, value);
  }

  reset (param, value) {
    this.action('reset', param, value);
  }

  subscribe (param) {
    this.action('subscribe', param);
  }

  unsubscribe (param) {
    this.action('unsubscribe', param);
  }

  unsubscribeAll () {
    this.params = this.params.filter((v) => {
      this.unsubscribe(v);
      return false;
    });
  }

  // /composition/clips/by-id/[id]/select
  // /composition/clips/by-id/[id]/connect
  // /composition/columns/by-id/[id]/connect
  // /composition/decks/by-id/[id]/select
  // /composition/layers/by-id/[id]/select
  // /composition/layers/by-id/[id]/clear
  trigger (path) {
    const action = {
      action: 'trigger',
      parameter: path
    };
    this.send(action);
  }

  send (obj) {
    this.logger.logDetail(`send: ${JSON.stringify(obj)}`);
    this.ws.send(JSON.stringify(obj));
  }
}
