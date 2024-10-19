/* eslint-disable no-cond-assign */
/* eslint-disable no-case-declarations */
/* eslint-disable no-new */
import { Program } from './core/Program.js';
import ProgramTerminal from './core/ProgramTerminal.js';
import { PioneerProDJLinkClient } from './modules/PioneerProDJLinkClient.js';
import { SongCatalog } from './songs/SongCatalog.js';
import { ResolumeOSCCLient } from './modules/ResolumeOSC.js';
import config from 'config';
import { ResolumeWebClient } from './modules/ResolumeWebClient.js';
import { AbletonLinkClient } from './modules/AbletonLinkClient.js';
import termkit from 'terminal-kit';
import { existsSync, mkdirSync } from 'node:fs';
import { Logger } from './core/Logger.js';
import { StreamDeckClient } from './modules/StreamDeckClient.js';
import { VirtualDJRelayClient } from './modules/VirtualDJRelayClient.js';

export const term = termkit.terminal;

const appsConfig = config.get('apps');
const settings = config.get('settings');

if (settings.logToDisk) {
  if (!existsSync('logs')) {
    mkdirSync('logs');
  }
} else {
  Logger.disableFileLogger();
}

const resolumeOSCCLient = new ResolumeOSCCLient({ port: appsConfig.resolume.oscPort, host: appsConfig.resolume.oscHost, logDetail: appsConfig.resolume.oscLogDetail });
const resolumeWebClient = new ResolumeWebClient({ port: appsConfig.resolume.webPort, host: appsConfig.resolume.webHost, logDetail: appsConfig.resolume.webLogDetail });

const streamDeckClient = new StreamDeckClient();
const virtualDJRelayClient = new VirtualDJRelayClient({ port: appsConfig.virtualDJRelay.port, host: appsConfig.virtualDJRelay.host });

const pioneerProDJLinkClient = new PioneerProDJLinkClient();
const abletonLinkClient = new AbletonLinkClient();

const programTerminal = new ProgramTerminal();
const songCatalog = new SongCatalog({ reloadOnChange: appsConfig.virtualDJ.databaseReloadOnChange, logToDisk: settings.logToDisk });

const program = new Program({ resolumeWebClient, virtualDJRelayClient, appsConfig, songCatalog, programTerminal, resolumeOSCCLient, pioneerProDJLinkClient, abletonLinkClient, streamDeckClient });
program.start();
