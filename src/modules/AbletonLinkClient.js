import EventEmitter2 from 'eventemitter2';
import abletonlink from 'abletonlink';

export class AbletonLinkClient extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
  }

  link;
  async start () {
    this.link = new abletonlink();
  }

  async setBeat (beat) {
    this.link.setBeatForce(beat);
  }

  async setBpm (bpm) {
    this.link.setBpm(bpm);
  }

  async setPhase (phase) {
    this.link.setQuantum(phase);
  }
}
