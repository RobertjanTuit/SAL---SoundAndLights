import EventEmitter2 from 'eventemitter2';
import abletonlink from 'abletonlink';
import { Logger } from '../core/Logger.js';

export class AbletonLinkClient extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
  }

  logger = new Logger('AbletonLinkClient');
  link;
  async start () {
    this.logger.log('Starting Ableton Link Client');
    this.link = new abletonlink();
    this.link.on('numPeers', (peers) => {
      this.logger.log('peers: ' + peers);
    });
  }

  async setBeat (beat) {
    this.link.setBeatForce(beat);
  }

  async setBpm (bpm) {
    // this.logger.log('Setting bpm: ' + bpm);
    this.link.setBpm(bpm);
  }

  async setPhase (phase) {
    this.link.setQuantum(phase);
  }
}
