/* eslint-disable no-case-declarations */
/* eslint-disable no-cond-assign */
import * as stores from '../stores.js';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { Logger } from './Logger.js';
import { writeFile } from 'fs/promises';
import { writeJSON } from '../utils.js';

export class Program {
  dataBuffer = [];
  logger = new Logger('Program');
  maxFrameRate = 30.0;
  maxFrameRateInterval = 1000.0 / this.maxFrameRate;
  constructor ({ appsConfig, processManager, virtualDJServer, soundswitchClient, virtualDJSoundSwitchBridge, songCatalog, programTerminal, resolumeOSCCLient, resolumeWebClient }) {
    this.virtualDJServer = virtualDJServer;
    this.soundswitchClient = soundswitchClient;
    this.programTerminal = programTerminal;
    this.virtualDJSoundSwitchBridge = virtualDJSoundSwitchBridge;
    this.songCatalog = songCatalog;
    this.resolumeOSCCLient = resolumeOSCCLient;
    this.appsConfig = appsConfig;
    this.processManager = processManager;
    this.resolumeWebClient = resolumeWebClient;

    processManager.on('running', (app) => {
      this.logger.log(`^grunning: ^w${app}`);
    });

    processManager.on('notrunning', (app) => {
      this.logger.log(`^rnotrunning: ^w${app}`);
    });

    this.virtualDJServer.on('data', (data) => {
      this.addVirtualDJDataToBuffer(data);
    });

    this.programTerminal.on('fixConnectedApps', async () => {
      const apps = [];
      if (!stores.status.soundSwitchOS2L) apps.push('SoundSwitch');
      if (!stores.status.virtualDJOS2L) apps.push('VirtualDJ');
      if (!stores.status.resolumeWeb) apps.push('Resolume');

      this.logger.log(`Fixing connected apps: ${apps.join(',')}`);
      await this.processManager.closeConnectedApps(!stores.status.soundSwitchOS2L, !stores.status.virtualDJOS2L, !stores.status.resolumeWeb);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.processManager.startConnectedApps();
    });

    this.resolumeWebClient.on('open', () => {
      applySnapshot(stores.status, { ...stores.status, resolumeWeb: true });
    });
    this.resolumeWebClient.on('close', () => {
      applySnapshot(stores.status, { ...stores.status, resolumeWeb: false });
    });
  }

  addVirtualDJDataToBuffer (data) {
    switch (data.evt) {
      case 'subscribed':
        this.dataBuffer.push(data);
        break;
      case 'btn':
        // Ignore btn events
        break;
      case 'beat':
        // TODO: Act on global beat
        break;
      default:
        this.logger.log(JSON.stringify(data));
        break;
    }
  }

  async start () {
    this.programTerminal.start();

    this.soundswitchClient.connect();

    this.resolumeWebClient.start();

    this.startLoop();

    this.programTerminal.waitForUserInput();

    this.processManager.start();

    await this.songCatalog.init();
  }

  async quit () {
    this.programTerminal.quit();
  }

  lastFps = this.maxFrameRate;
  async startLoop () {
    await this.mainLoop();
    const newTime = new Date().getTime();
    const elapsed = newTime - this.lastTime ?? 0;
    this.lastTime = new Date().getTime();
    if (elapsed) {
      this.lastFps = ((this.lastFps * (this.maxFrameRate - 1)) + (1000.0 / elapsed)) / this.maxFrameRate;
      this.programTerminal.updateFps(this.lastFps);
    }

    let nextFrameInterval = this.maxFrameRateInterval;
    if (elapsed > this.maxFrameRateInterval) {
      nextFrameInterval -= (elapsed - this.maxFrameRateInterval);
    }
    setTimeout(() => this.startLoop(), nextFrameInterval);
  }

  deckState = [null, null, null, null];
  async mainLoop () {
    this.deckState[0] = getSnapshot(stores.virtualDJDecks[0]);
    this.deckState[1] = getSnapshot(stores.virtualDJDecks[1]);
    this.updateLogs();
    this.parseDataBuffer();
    this.songDetection();
    this.bpmDetection();
    this.masterDetection();
    // this.phaseDetection();
  }

  lastMasterDeck = -1;
  masterDetection () {
    const masterDeck = this.deckState[0].masterdeck === 'on' ? 0 : 1;
    if (masterDeck !== this.lastMasterDeck) {
      this.lastMasterDeck = masterDeck;
      this.logger.log(`MasterDeck: ^y${masterDeck + 1}`);
      this.writeNowPlaying();
    }
  }

  writeNowPlaying () {
    writeFile('logs/nowPlaying.txt', `${this.deckState[this.lastMasterDeck].get_title} - ${this.deckState[this.lastMasterDeck].get_artist}`);
    writeJSON('logs/nowPlaying.json', this.deckState[this.lastMasterDeck]);
  }

  bpmDetection () {
    const masterState = this.deckState[0].masterdeck === 'on' ? this.deckState[0] : this.deckState[1];
    const beatSync = (Math.floor(masterState.get_beatpos) % 16) === 0;
    if (beatSync !== this.lastBeatSync) {
      this.lastBeatSync = beatSync;
      if (beatSync) {
        // this.logger.log(`Deck1 BeatSync: ${beatSync}`);
        this.resolumeWebClient.resync();
      }
      return;
    }
    if (masterState.get_bpm !== this.lastBpm) {
      this.lastBpm = masterState.get_bpm;
      // this.logger.log(`BPM: ^y${this.lastBpm}`);
      this.resolumeWebClient.bpm(this.lastBpm);
    }
  }

  // -----------------------------------------------------------------
  playingFile = ['', '', '', ''];
  lastSong = [null, null, null, null];
  songDetection () {
    this.deckSongDetection(0);
    this.deckSongDetection(1);
  }

  deckSongDetection (deck) {
    const playingFile = this.deckState[deck].get_filepath + '|' + this.deckState[deck].get_title + '|' + this.deckState[deck].get_artist;
    if (this.playingFile[deck] !== playingFile) {
      this.playingFile[deck] = playingFile;
      const song = this.songCatalog.getSong(this.deckState[deck].get_filepath, this.deckState[deck].get_artist, this.deckState[deck].get_title);
      if (song !== this.lastSong[deck]) {
        this.lastSong[deck] = song;
        if (song != null) {
          this.logger.log(`Deck ${deck + 1}: ^y${this.lastSong[deck].title} ^w- ^y${this.lastSong[deck].artist}`);
        } else if (this.deckState[deck].get_title != null && this.deckState[deck].get_artist != null) {
          // this.logger.log(`Deck1: ^rCould not find song in catalog - ^y${this.deckState[deck].get_title} ^w- ^y${this.deckState[deck].get_artist}`);
        }
        if (deck === this.lastMasterDeck) {
          this.writeNowPlaying();
        }
      }
    }
  }

  // -----------------------------------------------------------------

  updateLogs () {
    if (Logger.logLines.length) {
      this.programTerminal.updateTerminalFromLogger();
    }
  }

  parseDataBuffer () {
    if (this.dataBuffer.length) {
      // TODO: Only initialize below when needed.
      const decks = [];
      decks[0] = { ...getSnapshot(stores.virtualDJDecks[0]) };
      decks[1] = { ...getSnapshot(stores.virtualDJDecks[1]) };
      decks[2] = { ...getSnapshot(stores.virtualDJDecks[2]) };
      decks[3] = { ...getSnapshot(stores.virtualDJDecks[3]) };
      const virtualDJStatus = { ...stores.virtualDJStatus };

      let data;
      while (data = this.dataBuffer.shift()) {
        // this.logger.log(JSON.stringify(data));
        const trigger = data.trigger.split(' ');
        const DeckOrVerb = trigger[0];
        switch (DeckOrVerb) {
          case 'deck':
            const deckNr = trigger[1];
            const prop = trigger[2];
            switch (prop) {
              case ('play'):
              case ('loop'):
              case ('level'):
              case ('get_loop'):
              case ('get_text'):
              case ('get_bpm'):
              case ('get_title'):
              case ('get_time'):
              case ('get_artist'):
              case ('get_firstbeat'):
              case ('get_beatpos'):
              case ('get_filepath'):
              case ('masterdeck'):
              case ('get_limiter'):
              case ('loop_roll'):
              case ('get_year'):
              case ('get_composer'):
              case ('get_genre'):
              case ('get_album'):
                // if (prop === 'masterdeck') {
                //   this.logger.log(JSON.stringify(data));
                // }

                decks[deckNr - 1][prop] = data.value;
                break;
              case (''): // ignore the rest
                break;
              default: // output the unknown
                this.logger.log(JSON.stringify(data));
                break;
            }
            break;
          case 'master_volume':
          case 'get_limiter':
          case 'get_beat':
          case 'get_beat2':
          case 'crossfader':
          case 'masterdeck_auto':
          case 'get_vdj_folder':
            // console.log({ DeckOrVerb, data });
            virtualDJStatus[DeckOrVerb] = data.value;
            break;
          default:
            this.logger.log(JSON.stringify(data));
            break;
        }
      }

      applySnapshot(stores.virtualDJDecks[0], decks[0]);
      applySnapshot(stores.virtualDJDecks[1], decks[1]);
      applySnapshot(stores.virtualDJDecks[2], decks[2]);
      applySnapshot(stores.virtualDJDecks[3], decks[3]);
      applySnapshot(stores.virtualDJStatus, virtualDJStatus);
    }
  }
}
