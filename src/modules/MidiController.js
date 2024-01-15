import easymidi from 'easymidi';
import EventEmitter2 from 'eventemitter2';
import { Logger } from '../core/Logger.js';


export class MidiController extends EventEmitter2 {
  constructor({ midiDeviceName, midiMappings, midiDebugNote }) {
    super({ wildcard: true, ignoreErrors: true });
    this.midiDeviceName = midiDeviceName;
    this.midiMappings = midiMappings;
    this.logger = new Logger(`Midi[${midiDeviceName}}]`);
    this.logger.log(`Initializing midi for: ^b${midiDeviceName}^w`);
    this.input = new easymidi.Input(midiDeviceName);
    this.output = new easymidi.Output(midiDeviceName);
    this.input.on('cc', (msg) => {
      this.emit('cc', msg);
    });
    this.input.on('noteon', (msg) => {
      this.emit('noteon', msg);
    });
    this.input.on('noteoff', (msg) => {
      this.emit('noteoff', msg);
    });

    if (midiDebugNote) {
      setInterval(() => {
        this.send(midiMappings[midiDebugNote]);
      }, 1000);
    }
  }

  send(args) {
    const parsedArgs = { ...args };
    if (!parsedArgs.channel) parsedArgs.channel = 0;
    if (!parsedArgs.velocity) parsedArgs.velocity = 127;
    // this.logger.log(`Sending midi: ^b${JSON.stringify(parsedArgs)}`);
    this.output.send('noteon', { ...parsedArgs });
  }
}
