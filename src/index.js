/* eslint-disable no-cond-assign */
/* eslint-disable no-case-declarations */
/* eslint-disable no-new */
import { Program } from './core/Program.js';
import { SoundSwitchClient } from './modules/SoundSwitchClient.js';
import * as stores from './stores.js';
import ProgramTerminal from './core/ProgramTerminal.js';
import { VirtualDJServer } from './modules/VirtualDJServer.js';
import { VirtualDJSoundSwitchBridge } from './modules/VirtualDJSoundSwitchBridge.js';
import { SongCatalog } from './songs/SongCatalog.js';
import { ResolumeOSCCLient } from './modules/ResolumeOSC.js';
import config from 'config';
import quitOnSrcChange from './core/quitOnSrcChange.js';
import { ProcessManager } from './core/ProcessManager.js';
import { ResolumeWebClient } from './modules/ResolumeWebClient.js';
import EventEmitter2 from 'eventemitter2';

const appsConfig = config.get('apps');
const settings = config.get('settings');

class songStateManager extends EventEmitter2 {

  constructor () {
    super({ wildcard: true, ignoreErrors: true });

  }
}

const soundSwitchClient = new SoundSwitchClient(stores.status, { port: appsConfig.soundSwitch.port, host: appsConfig.soundSwitch.host });
const virtualDJServer = new VirtualDJServer(stores.status, { port: appsConfig.virtualDJ.port, host: appsConfig.virtualDJ.host });
const virtualDJSoundSwitchBridge = new VirtualDJSoundSwitchBridge(stores.status, soundSwitchClient, virtualDJServer);
const resolumeOSCCLient = new ResolumeOSCCLient({ port: appsConfig.resolume.oscPort, host: appsConfig.resolume.oscHost });
const resolumeWebClient = new ResolumeWebClient({ port: appsConfig.resolume.webPort, host: appsConfig.resolume.webHost });
const programTerminal = new ProgramTerminal();
const songCatalog = new SongCatalog({ reloadOnChange: appsConfig.virtualDJ.databaseReloadOnChange });
const processManager = new ProcessManager(appsConfig);

const program = new Program({ resolumeWebClient, processManager, appsConfig, virtualDJServer, soundswitchClient: soundSwitchClient, virtualDJSoundSwitchBridge, songCatalog, programTerminal, resolumeOSCCLient });
program.start();

quitOnSrcChange(settings, program, async () => {
  if (appsConfig.virtualDJ.killOnReloadQuit) {
    await processManager.killProcess('virtualDJ');
  }
});

if (appsConfig.virtualDJ.startOnLaunch) {
  processManager.startProcess('virtualDJ', true);
}
