/* eslint-disable no-case-declarations */
/* eslint-disable no-cond-assign */
import * as stores from '../stores.js';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { Logger } from './Logger.js';
import { mkdir, writeFile } from 'fs/promises';
import { writeJSON } from '../utils.js';
import { existsSync } from 'fs';

export class Program {
  dataBuffer = [];
  logger = new Logger('Program');
  maxFrameRate = 30.0;
  maxFrameRateInterval = 1000.0 / this.maxFrameRate;
  constructor ({ appsConfig, virtualDJRelayClient, songCatalog, programTerminal, resolumeOSCCLient, resolumeWebClient, pioneerProDJLinkClient, abletonLinkClient, streamDeckClient }) {
    this.virtualDJRelayClient = virtualDJRelayClient;
    this.programTerminal = programTerminal;
    this.songCatalog = songCatalog;
    this.resolumeOSCCLient = resolumeOSCCLient;
    this.appsConfig = appsConfig;
    this.resolumeWebClient = resolumeWebClient;
    this.pioneerProDJLinkClient = pioneerProDJLinkClient;
    this.abletonLinkClient = abletonLinkClient;
    this.streamDeckClient = streamDeckClient;

    this.virtualDJRelayClient.on('data', (data) => {
      this.addVirtualDJDataToBuffer(data);
    });

    this.abletonLinkClient.on('numPeers', (peers) => {
      applySnapshot(stores.status, { ...stores.status, abletonLinks: peers });
    });
    this.abletonLinkClient.start();
    this.streamDeckClient.start();
    this.streamDeckClient.on('connected', () => {
      applySnapshot(stores.status, { ...stores.status, streamDeck: true });
    });
    this.streamDeckClient.on('toggleSync', this.toggleSync);
    this.streamDeckClient.on('togglePrimary', this.togglePrimary);

    this.pioneerProDJLinkClient.on('connected', () => {
      applySnapshot(stores.status, { ...stores.status, pioneerProDJLink: true });
    });
    this.pioneerProDJLinkClient.start();

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

    programTerminal.on('togglePrimary', this.togglePrimary);
    programTerminal.on('toggleSync', this.toggleSync);
  }

  togglePrimary () {
    applySnapshot(stores.status, { ...stores.status, virtualDJOrPioneer: !stores.status.virtualDJOrPioneer });
  }

  toggleSync () {
    const abletonForSync = !stores.status.abletonForSync;
    applySnapshot(stores.status, { ...stores.status, abletonForSync });
    if (abletonForSync) {
      this.abletonLinkClient.enable();
    } else {
      this.abletonLinkClient.disable();
    }
  }

  addVirtualDJDataToBuffer (array) {
    for (const data of array) {
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
  }

  async start () {
    this.programTerminal.start();

    this.resolumeWebClient.start();

    this.virtualDJRelayClient.start();

    this.startLoop();

    this.programTerminal.waitForUserInput();

    this.programTerminal.on('resync', async () => {
      this.logger.log('Resyncing Resolume');
      this.resolumeWebClient.resync();
    });

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
    this.updateLogs();
    this.parseDataBuffer();

    this.deckState[0] = getSnapshot(stores.virtualDJDecks[0]);
    this.deckState[1] = getSnapshot(stores.virtualDJDecks[1]);
    this.deckState[2] = getSnapshot(stores.pioneerDecks[0]);
    this.deckState[3] = getSnapshot(stores.pioneerDecks[1]);

    this.songDetection();
    this.masterDetection();
    this.bpmDetection();
  }

  lastMasterDeck = -1;
  masterDetection () {
    const masterDeck = this.getMasterDeck();
    if (masterDeck !== this.lastMasterDeck) {
      applySnapshot(stores.status, { ...stores.status, masterDeck });
      this.lastMasterDeck = masterDeck;
      // this.logger.log(`MasterDeck: ^y${masterDeck + 1}`);
      this.bpmDetection();
      this.writeNowPlaying();
    }
  }

  getMasterDeck () {
    return stores.status.virtualDJOrPioneer
      ? (this.deckState[0].masterdeck === 'on' ? 0 : 1)
      : (this.deckState[2].masterdeck === 'on' ? 2 : 3);
  }

  async writeNowPlaying () {
    try {
      if (!existsSync('nowplaying')) {
        await mkdir('nowplaying');
      }
      await writeFile('nowPlaying/nowPlaying.txt', `${this.deckState[this.lastMasterDeck].get_title} - ${this.deckState[this.lastMasterDeck].get_artist}`);
      await writeJSON('nowPlaying/nowPlaying.json', this.deckState[this.lastMasterDeck]);
    } catch (e) {
      this.logger.log(`Error writing now playing: ${e}`);
    }
  }

  bpmDetection () {
    const abletonForSync = stores.status.abletonForSync;
    const masterState = this.deckState[this.getMasterDeck()];

    const beatPosAhead = Math.floor(masterState.get_beatpos - 0.01);
    const phaseAhead = beatPosAhead >= 0 ? (beatPosAhead % 4) : 3 - Math.abs(beatPosAhead) % 4;
    const beatAhead = beatPosAhead >= 0 ? (beatPosAhead % 16) : 15 - Math.abs(beatPosAhead) % 16;
    applySnapshot(stores.status, { ...stores.status, mainBeatPosAhead: beatPosAhead });
    applySnapshot(stores.status, { ...stores.status, mainPhaseAhead: phaseAhead });
    applySnapshot(stores.status, { ...stores.status, mainBeatAhead: beatAhead });

    const beatPos = Math.floor(masterState.get_beatpos);
    const phase = masterState.get_beatpos2 || (beatPos >= 0 ? (beatPos % 4) : 3 - Math.abs(beatPos) % 4);
    const beat = beatPos >= 0 ? (beatPos % 16) : 15 - Math.abs(beatPos) % 16;
    const beatSync = beat === 0;

    if (this.lastBeatPos !== beatPos) {
      this.lastBeatPos = beatPos;
      applySnapshot(stores.status, { ...stores.status, mainBeatPos: this.lastBeatPos });
    }

    if (masterState.get_bpm !== this.lastBpm) {
      this.lastBpm = masterState.get_bpm;
      applySnapshot(stores.status, { ...stores.status, mainBPM: this.lastBpm });

      if (this.lastBpm > 0) {
        if (abletonForSync) {
          this.abletonLinkClient.setBpm(this.lastBpm);
        } else {
          this.resolumeWebClient.bpm(this.lastBpm);
        }
      }
    }

    if (phase !== this.lastPhase) {
      applySnapshot(stores.status, { ...stores.status, mainPhase: phase });
      this.lastPhase = phase;
      if (abletonForSync) {
        this.abletonLinkClient.setPhase(phase);
      }
    }

    if (beat !== this.lastBeat) {
      applySnapshot(stores.status, { ...stores.status, mainBeat: beat });
      this.lastBeat = beat;
      if (abletonForSync) {
        this.abletonLinkClient.setBeat(beat);
      }
    }

    if (beatSync !== this.lastBeatSync) {
      this.lastBeatSync = beatSync;
      if (beatSync && !abletonForSync) {
        this.resolumeWebClient.resync();
      }
    }
  }

  // -----------------------------------------------------------------
  playingFile = ['', '', '', ''];
  lastSong = [null, null, null, null];
  songDetection () {
    this.deckSongDetection(0);
    this.deckSongDetection(1);
    this.deckSongDetection(2);
    this.deckSongDetection(3);
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
      const virtualDJStatus = { ...stores.virtualDJStatus };

      let data;
      while (data = this.dataBuffer.shift()) {
        // this.logger.log(JSON.stringify(data));
        const trigger = data.trigger.split(' ');
        const DeckOrVerb = trigger[0];
        switch (DeckOrVerb) {
          case 'deck':
            const deckNr = trigger[1];
            if (deckNr > 2) continue;
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
                this.logger.log('Unknown prop' + JSON.stringify(data));
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
            decks[0][DeckOrVerb] = data.value;
            decks[1][DeckOrVerb] = data.value;
            virtualDJStatus[DeckOrVerb] = data.value;
            break;
          default:
            this.logger.log(JSON.stringify(data));
            break;
        }
      }

      applySnapshot(stores.virtualDJDecks[0], decks[0]);
      applySnapshot(stores.virtualDJDecks[1], decks[1]);
      applySnapshot(stores.virtualDJStatus, virtualDJStatus);
    }
  }
}
