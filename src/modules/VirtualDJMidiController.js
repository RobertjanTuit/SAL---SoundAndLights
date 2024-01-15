import { MidiController } from './MidiController.js';

export class SoundSwitchMidiController extends MidiController {
  playPause () {
    this.send(this.midiMappings.playPause);
  }
}

export class VirtualDJMidi extends MidiController {
  deck1Play () {
    this.send(this.midiMappings.deck1Play ?? { notfound: true });
  }

  deck1Stop () {
    // this.logger.log(JSON.stringify(this.midiMappings));
    this.send(this.midiMappings.deck1Stop ?? { notfound: true });
  }

  deck2Play () {
    this.send(this.midiMappings.deck2Play ?? { notfound: true });
  }

  deck2Stop () {
    this.send(this.midiMappings.deck2Stop ?? { notfound: true });
  }
}
