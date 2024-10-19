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
    this.logger = new Logger(group, 'main');
    this.detailLogger = detailEnabled ? new Logger(group, group) : new NullLogger(group, group);
  }

  log (msg, isDetail) {
    if (!isDetail) {
      this.logger.log(msg);
    }
    this.detailLogger.log(msg);
  }

  logDetail (msg) {
    this.log(msg, true);
  }
}

export class Logger {
  static logLines = [];
  static get (name) {
    return loggers[name] ?? (loggers[name] = new Logger(name));
  }

  static direct = false;
  static disabledFileLogger = false;
  static disableFileLogger () {
    Logger.disabledFileLogger = true;
  }

  static log (msg) {
    getLogger('global').log(msg);
  }

  static error (msg) {
    getLogger('global').error(msg);
  }

  constructor (group, name = 'main') {
    this.name = name;
    this.groupLabel = group !== '' ? `[^b${group}^w]` : '';
    this.prepareFiles(name, this.groupLabel);
    loggers[name] = this;
    this.logger = getLogger(name);
  }

  prepareFiles (name, groupLabel) {
    if (Logger.disabledFileLogger) return;

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
    this.log(`^r[ERROR] ${msg}`);
  }

  log (msg) {
    if (Logger.direct) {
      console.log(stringKit.format(`^y${moment().format('HH:mm:ss.SSS')}^w - ${this.groupLabel !== '' ? this.groupLabel + ' ' : ''}${msg}`));
      return;
    }
    if (this.name === 'main') {
      Logger.logLines.push(`^y${moment().format('HH:mm:ss.SSS')}^w - ${this.groupLabel !== '' ? this.groupLabel + ' ' : ''}${msg}`);
    }
    if (typeof msg === 'object') {
      msg = JSON.stringify(msg);
    }
    if (Logger.disabledFileLogger) return;
    this.ansiFileLogger.info(stringKit.format(msg));
    this.fileLogger.info(stripAnsi((stringKit.format(msg))));
  }
}

function archiveLogFiles (logFile, ansiLogFile) {
  if (Logger.disabledFileLogger) return;
  if (existsSync(logFile)) {
    unlinkSync(logFile);
  }

  if (existsSync(ansiLogFile)) {
    unlinkSync(ansiLogFile);
  }
}
