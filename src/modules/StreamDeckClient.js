import EventEmitter2 from 'eventemitter2';
import { Logger } from '../core/Logger.js';

export class StreamDeckClient extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
  }

  logger = new Logger('StreamDeckClient');

  start () {
    this.logger.log('Starting');
  }
}
