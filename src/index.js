/* eslint-disable no-cond-assign */
/* eslint-disable no-case-declarations */
/* eslint-disable no-new */
import { Program } from './core/Program.js';
import { SoundSwitchClient } from './modules/SoundSwitchClient.js';
import { status } from './stores.js';
import ProgramTerminal from './core/ProgramTerminal.js';
import { VirtualDJServer } from './modules/VirtualDJServer.js';
import { VirtualDJSoundSwitchBridge } from './modules/VirtualDJSoundSwitchBridge.js';
import { SongCatalog } from './songs/SongCatalog.js';
import { ResolumeOSCCLient } from './modules/ResolumeOSC.js';
import config from 'config';
import quitOnSrcChange from './core/quitOnSrcChange.js';
import { ProcessManager } from './core/ProcessManager.js';
import { ResolumeWebClient } from './modules/ResolumeWebClient.js';
import { SoundSwitchMidiController, VirtualDJMidi as VirtualDJMidiController } from './modules/VirtualDJMidiController.js';
import termkit from 'terminal-kit';
import { existsSync, mkdirSync } from 'node:fs';
export const term = termkit.terminal;

if (!existsSync('logs')) {
  mkdirSync('logs');
}

const appsConfig = config.get('apps');
const settings = config.get('settings');

const soundSwitchMidiController = new SoundSwitchMidiController({ midiDeviceName: appsConfig.soundSwitch.midiDeviceName, midiMappings: appsConfig.soundSwitch.midiMappings, midiDebugNote: appsConfig.soundSwitch.midiDebugNote, logDetail: appsConfig.soundSwitch.midiLogDetail });
const soundSwitchClient = new SoundSwitchClient(status, { port: appsConfig.soundSwitch.port, host: appsConfig.soundSwitch.host, logDetail: appsConfig.soundSwitch.os2lLogDetail });

const virtualDJServer = new VirtualDJServer(status, { port: appsConfig.virtualDJ.port, host: appsConfig.virtualDJ.host, logDetail: appsConfig.virtualDJ.os2lLogDetail });

const virtualDJMidiController = new VirtualDJMidiController({ midiDeviceName: appsConfig.virtualDJ.midiDeviceName, midiMappings: appsConfig.virtualDJ.midiMappings, midiDebugNote: appsConfig.virtualDJ.midiDebugNote, logDetail: appsConfig.virtualDJ.midiLogDetail });

const virtualDJSoundSwitchBridge = new VirtualDJSoundSwitchBridge(status, soundSwitchClient, virtualDJServer);

const resolumeOSCCLient = new ResolumeOSCCLient({ port: appsConfig.resolume.oscPort, host: appsConfig.resolume.oscHost, logDetail: appsConfig.resolume.oscLogDetail });
const resolumeWebClient = new ResolumeWebClient({ port: appsConfig.resolume.webPort, host: appsConfig.resolume.webHost, logDetail: appsConfig.resolume.webLogDetail });

const programTerminal = new ProgramTerminal();
const songCatalog = new SongCatalog({ reloadOnChange: appsConfig.virtualDJ.databaseReloadOnChange });
const processManager = new ProcessManager({ appsConfig, virtualDJMidiController, virtualDJServer });

const program = new Program({ resolumeWebClient, processManager, appsConfig, virtualDJServer, soundswitchClient: soundSwitchClient, virtualDJSoundSwitchBridge, songCatalog, programTerminal, resolumeOSCCLient });
program.start();

programTerminal.on('debug', (data) => {
  virtualDJServer.send('{"evt":"set","trigger":"deck 1 play","value":"off"} ');
});

quitOnSrcChange(settings, program, async () => {
  if (appsConfig.virtualDJ.killOnReloadQuit) {
    await processManager.killProcess('virtualDJ');
  }
});

if (appsConfig.virtualDJ.startOnLaunch) {
  if (processManager.isRunning.virtualDJ) {
    await processManager.killProcess('virtualDJ');
  }
  processManager.startProcess('virtualDJ', true);
}
