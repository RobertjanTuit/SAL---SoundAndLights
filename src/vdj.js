import config from 'config';
import { status } from './stores.js';

import { VirtualDJRelayServer } from './modules/VirtualDJRelayServer.js';
import { VirtualDJServer } from './modules/VirtualDJServer.js';
import { VirtualDJSoundSwitchBridge } from './modules/VirtualDJSoundSwitchBridgeStub.js';
import { virtualDJProcess } from './modules/VirtualDJProcess.js';

import { Logger } from './core/Logger.js';
Logger.disableFileLogger();
Logger.direct = true;
console.clear();

const appsConfig = config.get('apps');

const virtualDJServer = new VirtualDJServer(status, { port: appsConfig.virtualDJ.port, host: appsConfig.virtualDJ.host, logDetail: false });
const virtualDJSoundSwitchBridge = new VirtualDJSoundSwitchBridge(status, virtualDJServer);

const virtualDJRelayServer = new VirtualDJRelayServer({ port: appsConfig.virtualDJRelay.port, host: appsConfig.virtualDJRelay.host, virtualDJServer });

virtualDJRelayServer.start();

virtualDJSoundSwitchBridge.start();
virtualDJServer.start();

virtualDJProcess();
