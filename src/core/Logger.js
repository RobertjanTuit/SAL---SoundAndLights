import moment from 'moment/moment.js';
import SimpleNodeLogger from 'simple-node-logger';
import stringKit from 'string-kit';
import { existsSync, unlinkSync } from 'fs';
import stripAnsi from 'strip-ansi';

const loggers = {
  main: null
};

function getLogger (name) {
  return loggers[name] ?? (loggers[name] = new Logger(name));
}

export class NullLogger {
  log () { }
}

export class ComplexLogger {
  constructor (group, detailEnabled = false) {
    if (this.disabled) return;
    this.logger = new Logger(group, 'main');
    this.detailLogger = detailEnabled ? new Logger(group, group) : new NullLogger(group, group);
  }

  log (msg, isDetail) {
    if (this.disabled) return;
    if (!isDetail) {
      this.logger.log(msg);
    }
    this.detailLogger.log(msg);
  }

  logDetail (msg) {
    if (this.disabled) return;
    this.log(msg, true);
  }
}

export class Logger {
  static logLines = [];
  static get (name) {
    return loggers[name] ?? (loggers[name] = new Logger(name));
  }

  static disabled = false;
  static disable () {
    this.disabled = true;
  }

  static log (msg) {
    if (this.disabled) return;
    getLogger('global').log(msg);
  }

  static error (msg) {
    if (this.disabled) return;
    getLogger('global').error(msg);
  }

  constructor (group, name = 'main') {
    if (this.disabled) return;
    this.name = name;
    this.groupLabel = group !== '' ? `[^b${group}^w]` : '';
    this.prepareFiles(name, this.groupLabel);
    loggers[name] = this;
    this.logger = getLogger(name);
  }

  prepareFiles (name, groupLabel) {
    const logFile = `logs/log-${name}.log`;
    const ansiLogFile = `logs/log-${name}.ansi`;
    archiveLogFiles(logFile, ansiLogFile);

    const logManager = new SimpleNodeLogger({ logFilePath: logFile });
    logManager.createFileAppender({ logFilePath: logFile });
    this.fileLogger = logManager.createLogger(stripAnsi(stringKit.format(groupLabel)));

    const ansiLogManager = new SimpleNodeLogger({ logFilePath: ansiLogFile });
    ansiLogManager.createFileAppender({ logFilePath: ansiLogFile });
    this.ansiFileLogger = ansiLogManager.createLogger(stringKit.format(groupLabel));
  }

  error (msg) {
    this.log(`^r${msg}`);
  }

  log (msg) {
    if (this.disabled) return;
    if (this.name === 'main') {
      Logger.logLines.push(`^y${moment().format('HH:mm:ss.SSS')}^w - ${this.groupLabel !== '' ? this.groupLabel + ' ' : ''}${msg}`);
    }
    if (typeof msg === 'object') {
      msg = JSON.stringify(msg);
    }
    this.ansiFileLogger.info(stringKit.format(msg));
    this.fileLogger.info(stripAnsi((stringKit.format(msg))));
  }
}

function archiveLogFiles (logFile, ansiLogFile) {
  if (existsSync(logFile)) {
    unlinkSync(logFile);
  }

  if (existsSync(ansiLogFile)) {
    unlinkSync(ansiLogFile);
  }
}
