import EventEmitter2 from 'eventemitter2';
import abletonlink from 'abletonlink';
import { Logger } from '../core/Logger.js';
import { set } from 'mobx';

export class AbletonLinkClient extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
  }

  logger = new Logger('AbletonLinkClient');
  link;
  peers = 0;
  enabled = false;
  updateInterval = null;
  async start () {
    this.logger.log('Starting Ableton Link Client');
    this.link = new abletonlink();
    this.link.disable();
    this.link.on('numPeers', (peers) => {
      this.emit('numPeers', peers);
      this.peers = peers;
    });
    setInterval(() => {
      if (this.peers === 0 && this.enabled) {
        this.link.disable();
        this.link.enable();
      }
    }, 1000);
  }

  enable () {
    this.logger.log('Enabling Ableton Link');
    this.link.enable();
    this.enabled = true;
    this.updateInterval = setInterval(() => {
      this.update();
    }, 200);
  }

  disable () {
    this.logger.log('Disabling Ableton Link');
    this.link.disable();
    this.enabled = false;
    clearInterval(this.updateInterval);
  }

  async setBeat (beat) {
    this.beat = beat;
  }

  async setBpm (bpm) {
    this.bpm = bpm;
  }

  async setPhase (phase) {
    this.phase = phase;
  }

  async update () {
    this.link.setBpm(this.bpm || 120);
    this.link.setBeat(this.beat || 0);
    this.link.setQuantum(this.phase || 0);
  }
}
