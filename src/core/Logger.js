import moment from 'moment/moment.js';
import SimpleNodeLogger from 'simple-node-logger';
import stringKit from 'string-kit';
import { existsSync, renameSync, mkdirSync, statSync, unlinkSync } from 'fs';
import stripAnsi from 'strip-ansi';

const loggers = {
  main: null
};

function getLogger (name) {
  return loggers[name] ?? (loggers[name] = new Logger(name));
}

export class NullLogger {
  constructor (group, name = 'main') {
    const logFile = `logs/log-${name}.log`;
    const ansiLogFile = `logs/log-${name}.ansi`;
    archiveLogFiles(logFile, ansiLogFile);
  }

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

  static log (msg) {
    getLogger('global').log(msg);
  }

  constructor (group, name = 'main') {
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

  log (msg) {
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
