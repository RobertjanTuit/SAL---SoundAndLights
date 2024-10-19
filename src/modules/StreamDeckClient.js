import EventEmitter2 from 'eventemitter2';
import { Logger } from '../core/Logger.js';
import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node';
import * as stores from '../stores.js';
import { onSnapshot } from 'mobx-state-tree';
import { PNG } from 'pngjs';
import { readFileSync } from 'fs';
import { createCanvas, loadImage } from 'canvas';

export class StreamDeckClient extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
  }

  logger = new Logger('StreamDeckClient');

  async start () {
    this.logger.log('Starting');

    this.status = stores.status;
    onSnapshot(stores.status, () => {
      this.status = stores.status;
    });

    listStreamDecks().then((devices) => {
      if (devices.length === 0) {
        this.logger.error('No Stream Deck devices found');
      } else {
        this.device = devices[0];
        this.logger.log(`Connecting to Stream Deck device: ${this.device.path}`);
        openStreamDeck(devices[0].path).then((streamDeck) => {
          this.streamDeck = streamDeck;
          this.initializeStreamDeck();
          this.emit('connected', this.streamDeck);
        }).catch((error) => {
          this.logger.error(`Error opening Stream Deck: ${error}`);
        });
      }
    }).catch((error) => {
      this.logger.error(`Error listing Stream Deck devices: ${error}`);
    });
  }

  refreshCount = 1;
  updateFromStatus () {
    if (this.streamDeck && this.status) {
      if (this.lastStatus?.virtualDJOS2L !== this.status?.virtualDJOS2L) this.streamDeck.fillKeyBuffer(8, this.textColorButton('VirtualDJ', this.status.virtualDJOS2L ? 'green' : 'red', '20px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.pioneerProDJLink !== this.status?.pioneerProDJLink) this.streamDeck.fillKeyBuffer(9, this.textColorButton('Pioneer', this.status.pioneerProDJLink ? 'green' : 'red', '20px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.resolumeWeb !== this.status?.resolumeWeb) this.streamDeck.fillKeyBuffer(10, this.textColorButton('Resolume', this.status.resolumeWeb ? 'green' : 'red', '20px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.abletonLinks !== this.status?.abletonLinks) this.streamDeck.fillKeyBuffer(11, this.textColorButton('Ableton:' + this.status.abletonLinks, this.status.abletonLinks ? 'green' : 'red', '20px', 'arial'), { format: 'rgba' });

      if (this.lastStatus?.virtualDJOrPioneer !== this.status?.virtualDJOrPioneer) this.streamDeck.fillKeyBuffer(14, this.textColorButton('Primary:\r\n' + (this.status.virtualDJOrPioneer ? 'VirtualDJ' : 'Pioneer'), this.status.virtualDJOrPioneer ? 'blue' : 'magenta', '20px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.abletonForSync !== this.status?.abletonForSync) this.streamDeck.fillKeyBuffer(15, this.textColorButton('Sync:\r\n' + (this.status.abletonForSync ? 'Ableton' : 'Resolume'), this.status.abletonForSync ? 'magenta' : 'blue', '20px', 'arial'), { format: 'rgba' });

      if (this.lastStatus?.mainBPM !== this.status?.mainBPM) this.streamDeck.fillKeyBuffer(24, this.textColorButton(this.toFixedString(this.status.mainBPM, 2), this.status.mainBPM ? 'Deep Teal' : 'Dark Teal', '28px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.mainBeat !== this.status?.mainBeat) this.streamDeck.fillKeyBuffer(25, this.textColorButton(this.status.mainBeat, this.status.mainBeat ? 'lime' : 'limegreen', '40px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.mainPhase !== this.status?.mainPhase) this.streamDeck.fillKeyBuffer(26, this.textColorButton(this.status.mainPhase, this.status.mainPhase ? 'deeppink' : 'mediumvioletred', '40px', 'arial'), { format: 'rgba' });
      if (this.lastStatus?.mainBeatPosA !== this.status?.mainBeatPos) this.streamDeck.fillKeyBuffer(27, this.textColorButton(this.status.mainBeatPos, this.status.mainBeatPos ? 'gold' : 'red', '40px', 'arial'), { format: 'rgba' });

      this.loadSteamDeckImage(31, `images/progress-${this.refreshCount}.png`);

      this.refreshCount++;
      if (this.refreshCount > 12) this.refreshCount = 1;

      this.lastStatus = { ...this.status };
    }
  }

  keyPressed (ix) {
    switch (ix) {
      case 14:
        this.emit('togglePrimary');
        break;
      case 15:
        this.emit('toggleSync');
        break;
    }
  }

  textColorButtonCache = {};
  textColorButton (text, color, fontSize, fontFamily) {
    const cacheKey = [text, color, fontSize, fontFamily].join('-');
    let result = this.textColorButtonCache[cacheKey];
    if (!result) {
      const n = text;
      const canvas = createCanvas(96, 96);
      const ctx = canvas.getContext('2d');
      ctx.font = `${fontSize} "${fontFamily}"`;
      ctx.fillStyle = color;
      this.roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText(n.toString(), canvas.height / 2, canvas.height / 2);
      result = ctx.getImageData(0, 0, canvas.width, canvas.height)?.data;
      this.textColorButtonCache[cacheKey] = result;
    }

    return result;
  }

  roundRect (ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
      stroke = true;
    }
    if (typeof radius === 'undefined') {
      radius = 5;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (stroke) {
      ctx.stroke();
    }
    if (fill) {
      ctx.fill();
    }
  }

  imageCache = {};
  loadSteamDeckImage (index, path) {
    if (!this.imageCache[path]) {
      const pngData = readFileSync(path);
      const png = PNG.sync.read(pngData);
      this.imageCache[path] = png.data;
    }

    this.streamDeck.fillKeyBuffer(index, this.imageCache[path], { format: 'rgba' });
  }

  initializeStreamDeck () {
    this.streamDeck.clearPanel();
    this.loadSteamDeckImage(0, 'images/logo-R.png');
    this.loadSteamDeckImage(1, 'images/logo-Js.png');
    this.loadSteamDeckImage(3, 'images/logo-s.png');
    this.loadSteamDeckImage(4, 'images/logo-a.png');
    this.loadSteamDeckImage(5, 'images/logo-l.png');
    this.loadSteamDeckImage(6, 'images/logo-u.png');
    this.loadSteamDeckImage(7, 'images/logo-t.png');
    this.status = stores.status;
    this.streamDeck.on('down', (control) => this.keyPressed(control.index));

    setInterval(() => {
      this.updateFromStatus();
    }, 200);
  }

  toFixedString (num, digits) {
    return (Math.round(num * 100) / 100).toFixed(digits);
  }
}
