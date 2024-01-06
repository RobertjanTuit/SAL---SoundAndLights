import moment from 'moment/moment.js';

const loggers = {
  main: null
};

function getLogger (name) {
  return loggers[name] ?? (loggers[name] = new Logger(name));
}

export class Logger {
  static logLines = [];

  static get (name) {
    return loggers[name] ?? (loggers[name] = new Logger(name));
  }

  static log (msg) {
    getLogger('global').log(msg);
  }

  constructor (group, name = 'main') {
    loggers[name] = this;
    this.logger = getLogger(name);
    this.group = group;
  }

  log (msg) {
    const groupLabel = this.group ? `^w[^b${this.group}^w] ` : '';
    Logger.logLines.push(`^y${moment().format('HH:mm:ss.SSS')}^w - ${groupLabel}${msg}`);
  }
}
