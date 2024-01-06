// const bonjour = require('bonjour')();
export const names = {
  os2l: 'os2l',
  doPublish: 'doPublish',
  port: 'port',
  object: 'object'
};

export const messages = {
  cantCloseNotRunning: 'OS2LSever can\'t close because it is not running.',
  badPackage: 'Bad OS2L package received!',
  badOptions: 'Expected an object for options!',
  cantStartAlreadyRunning: 'Can\'t start, OS2LServer is already running!',
  clientAlreadyConnected: 'OS2LClient is already connected!'
};

export const eventNames = {
  tryConnect: 'tryConnect',
  debug: 'debug',
  error: 'error',
  end: 'end',
  close: 'close',
  closed: 'closed',
  discover: 'discover',
  discovered: 'discovered',
  started: 'started',
  connecting: 'connecting',
  connect: 'connected',
  connected: 'connected',
  disconnected: 'disconnected',
  data: 'data',
  published: 'published',
  listening: 'listening'
};
