import * as stores from '../stores.js';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import EventEmitter2 from 'eventemitter2';
import { bringOnline } from 'prolink-connect';
import { Logger } from '../core/Logger.js';

export class PioneerProDJLinkClient extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
  }

  logger = new Logger('PioneerProDJLinkClient');
  network;
  async start () {
    this.logger.log('Starting Pioneer Pro DJ Link Client');
    // Open connections to the network
    try {
      this.network = await bringOnline();
    } catch (e) {
      // Something is using the status port... Most likely rekordbox
      this.logger.error(`Failed to connect: ${e}`);
      return;
    }

    const devices = {};
    this.network.deviceManager.on('connected', device => {
      this.emit('connected', device);
      this.logger.log(`Device Connected: ${device.name}::${device.id}`);
      devices[device.id] = device;
    });

    this.network.deviceManager.on('disconnected', device => {
      this.logger.log(`Device disconnected: ${device.name})::${device.id}`);
      delete devices[device.id];
    });

    await this.network.autoconfigFromPeers();
    this.network.connect();
    this.network.statusEmitter.on('status', async state => {
      // this.logger.log(`Mixstatus change: ${JSON.stringify(state)}`);

      const device = devices[state.deviceId];
      if (!device) {
        this.logger.error(`Received status for unknown device: ${state.deviceId}`);
      } else {
        const decks = [];
        decks[0] = { ...getSnapshot(stores.pioneerDecks[0]) };
        decks[1] = { ...getSnapshot(stores.pioneerDecks[1]) };

        if (state.deviceId === 1) {
          await this.setStateFromDevice(decks[0], state, device);
        }
        if (state.deviceId === 2) {
          await this.setStateFromDevice(decks[1], state, device);
        }

        applySnapshot(stores.pioneerDecks[0], decks[0]);
        applySnapshot(stores.pioneerDecks[1], decks[1]);
      }
    });
  }

  async setStateFromDevice (deck, state, device) {
    if (device.trackId !== state.trackId || device.trackSlot !== state.trackSlot || device.trackType !== state.trackType) {
      const { trackId, trackSlot, trackType, trackDeviceId } = state;
      device.trackId = state.trackId;
      device.trackSlot = state.trackSlot;
      device.trackType = state.trackType;
      if (trackId > 0) {
        const trackData = {
          deviceId: trackDeviceId,
          trackId,
          trackType,
          trackSlot
        };

        const track = await this.network.db.getMetadata(trackData);
        // this.logger.log(`Got track for ${JSON.stringify(trackData)} metadata: ${JSON.stringify(track)}}`);
        deck.get_title = track?.title;
        deck.get_artist = track?.artist?.name;
        deck.get_filepath = track?.filePath + '/' + track?.fileName;
      }
    }

    deck.masterdeck = state.isMaster ? 'on' : 'off';
    deck.get_bpm = state.trackBPM !== null && state.trackBPM !== undefined ? (state.trackBPM + (state.trackBPM * (state.sliderPitch ?? 0)) / 100) : 0;
    deck.get_beatpos = state.beat || 0;
    deck.get_beat = state.beatInMeasure || 0;
    deck.get_beat2 = state.beatInMeasure || 0;
    deck.get_time = state.beat == null || state.trackBPM == null ? 0 : ((state.beat / state.trackBPM) * 60) * 1000;
  }
}
