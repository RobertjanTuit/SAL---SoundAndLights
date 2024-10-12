/* eslint-disable no-new */
import moment from 'moment';
import { names } from '../constants.js';
import { onSnapshot } from 'mobx-state-tree';
import * as stores from '../stores.js';
import { Logger } from '../core/Logger.js';
import EventEmitter2 from 'eventemitter2';
import termkit from 'terminal-kit';
export const term = termkit.terminal;

const version = process.env.npm_package_version;
const defaultTextProps = { leftPadding: ' ', rightPadding: ' ', attr: { contentHasMarkup: true } };
const virtualDJText = '^mVirtualDJ';
const pioneerText = '^cPioneer';

export default class ProgramTerminal extends EventEmitter2 {
  constructor () {
    super({ wildcard: true, ignoreErrors: true });
    this.term = term;
  }

  title = '^rR^gJ^bs ^ySALUT^t - ^mSound ^tand ^BLight ^GUtility ^CToolkit ^W' + version;
  start () {
    term.clear();
    term.fullscreen(true);
    const document = term.createDocument();
    new termkit.Layout({
      parent: document,
      boxChars: 'double',
      layout: {
        id: 'main',
        widthPercent: 100,
        heightPercent: 100,
        rows: [
          {
            id: 'title-row',
            height: 3,
            columns: [
              { id: 'title' },
              { id: 'fps', width: 6 }
            ]
          },
          {
            id: 'status-row',
            height: 3,
            columns: [
              { id: names.masterDeck },
              { id: names.mainBPM },
              { id: names.virtualDJOrPioneer },
              { id: names.statusVirtualDJO2L },
              { id: names.statusSoundswitchO2L },
              { id: names.statusResolumeOSC }
            ]
          },
          {
            id: 'vdj-decks',
            height: 5,
            columns: [
              { id: names.vdjDeck1 },
              { id: names.vdjDeck2 }
            ]
          },
          {
            id: 'pioneer-decks',
            height: 5,
            columns: [
              { id: names.pioneerDeck1 },
              { id: names.pioneerDeck2 }
            ]
          },
          {
            id: names.log
          },
          {
            id: names.commands,
            height: 3
          }
        ]
      }
    });

    new termkit.Text({ parent: document.elements.title, content: ` ${this.title}`, contentHasMarkup: true, attr: {} });
    this.fpsText = new termkit.Text({ parent: document.elements.fps, contentHasMarkup: true, leftPadding: ' ', attr: {} });

    this.masterDeck = this.createText(document, names.masterDeck);
    this.mainBPM = this.createText(document, names.mainBPM);
    this.virtualDJOrPioneerText = this.createText(document, names.virtualDJOrPioneer);
    this.soundSwitchtatusText = this.createText(document, names.statusSoundswitchO2L);
    this.virtualDJStatusText = this.createText(document, names.statusVirtualDJO2L);
    this.resolumeOSCText = this.createText(document, names.statusResolumeOSC);

    this.vdjDecks = [{}, {}];
    this.createDeck(this.vdjDecks, document, 0, names.vdjDeck1);
    this.createDeck(this.vdjDecks, document, 1, names.vdjDeck2);

    this.pioneerDecks = [{}, {}];
    this.createDeck(this.pioneerDecks, document, 0, names.pioneerDeck1);
    this.createDeck(this.pioneerDecks, document, 1, names.pioneerDeck2);

    this.logText = this.createTextBox(document, names.log, '');
    this.commandsText = this.createText(document, names.commands, { content: '^gQ^wuit ^-|^: ^gT^woggle Primary ^-|^:', contentHasMarkup: true });

    onSnapshot(stores.status, (snapshot) => {
      this.updateTerminalFromStatus(snapshot);
    });
    onSnapshot(stores.virtualDJDecks[0], (snapshot) => {
      this.updateTerminalFromVDJDeck1(snapshot);
    });
    onSnapshot(stores.virtualDJDecks[1], (snapshot) => {
      this.updateTerminalFromVDJDeck2(snapshot);
    });

    onSnapshot(stores.pioneerDecks[0], (snapshot) => {
      this.updateTerminalFromPioneerDeck1(snapshot);
    });
    onSnapshot(stores.pioneerDecks[1], (snapshot) => {
      this.updateTerminalFromPioneerDeck2(snapshot);
    });

    this.updateTerminalFromStatus(stores.status);
    this.updateTerminalFromVDJDeck1(stores.virtualDJDecks[0]);
    this.updateTerminalFromVDJDeck2(stores.virtualDJDecks[1]);

    this.updateTerminalFromPioneerDeck1(stores.pioneerDecks[0]);
    this.updateTerminalFromPioneerDeck2(stores.pioneerDecks[1]);

    this.updateFps(30);
  }

  createDeck (decks, document, deck, name) {
    decks[deck].text = this.createText(document, name, { x: 1, y: 0 });
    decks[deck].master = this.createText(document, name, { x: 1, y: 1, width: 3 });
    decks[deck].level = this.createText(document, name, { x: 3, y: 1, width: 5 });
    decks[deck].bpm = this.createText(document, name, { x: 9, y: 1, width: 7 });
    decks[deck].beatPos = this.createText(document, name, { x: 16, y: 1, width: 7 });
    decks[deck].elapsed = this.createText(document, name, { x: 24, y: 1, width: 18 });
    decks[deck].phases = this.createText(document, name, { x: 1, y: 2, width: 40 });
  }

  getDeckLabel (nr) {
    switch (nr) {
      case 0:
        return `^W0^-:^:${virtualDJText}-1`;
      case 1:
        return `^W1^-:^:${virtualDJText}-^M2`;
      case 2:
        return `^W2^-:^:${pioneerText}-1`;
      case 3:
        return `^W3^-:^:${pioneerText}-^C2`;
    }
  }

  updateTerminalFromStatus (globalStatus) {
    this.masterDeck.setContent(`Master Deck: ${this.getDeckLabel(globalStatus.masterDeck)}`, true);
    this.mainBPM.setContent(`BPM: ${globalStatus.mainBPM}`, true);
    this.virtualDJOrPioneerText.setContent(`Primary: ${(globalStatus.virtualDJOrPioneer ? virtualDJText : pioneerText)}`, true);
    this.soundSwitchtatusText.setContent(`Pioneer Pro DJ Link: ${this.trueFalseColor(globalStatus.pioneerProDJLink)}`, true);
    this.virtualDJStatusText.setContent(`VirtualDJ OS2L: ${this.trueFalseColor(globalStatus.virtualDJOS2L)}`, true);
    this.resolumeOSCText.setContent(`Resolume Web: ${this.trueFalseColor(globalStatus.resolumeWeb)}`, true);
  }

  updateTerminalFromLogger () {
    while (Logger.logLines.length) {
      const line = Logger.logLines.shift();
      this.logText.prependContent(line + '\r\n');
    }
  }

  updateTerminalFromVDJDeck1 (deck) {
    this.updateDeck(this.vdjDecks, 0, deck, this.getDeckLabel(0));
  }

  updateTerminalFromVDJDeck2 (deck) {
    this.updateDeck(this.vdjDecks, 1, deck, this.getDeckLabel(1));
  }

  updateTerminalFromPioneerDeck1 (deck) {
    this.updateDeck(this.pioneerDecks, 0, deck, this.getDeckLabel(2));
  }

  updateTerminalFromPioneerDeck2 (deck) {
    this.updateDeck(this.pioneerDecks, 1, deck, this.getDeckLabel(3));
  }

  updateFps (fps) {
    if (this.lastFps !== fps) {
      this.lastFps = fps;
      this.fpsText.setContent(`^y${Math.round(fps)}`, true);
    }
  }

  updateDeck (decks, deckNr, deck, deckLabel) {
    let title = `^g${deck.get_title}`;
    if (deck.get_artist) {
      title += ` ^w- ^b${deck.get_artist}`;
    }
    decks[deckNr].text.setContent(`^w^-[^:${deckLabel}^w^-]^: ${title}`, true);
    decks[deckNr].master.setContent(`^Y${deck.masterdeck === 'on' ? 'M' : ''}`, true);
    decks[deckNr].level.setContent(`${this.toFixedString(deck.level, 2)}`, true);
    decks[deckNr].bpm.setContent(`${this.toFixedString(deck.get_bpm)}`, true);
    decks[deckNr].beatPos.setContent(`${this.toFixedString(deck.get_beatpos, 2)}`, true);
    // TODO: Use better method to turn timestamp into string, can go into negative as well
    decks[deckNr].elapsed.setContent(`${moment(Math.max(deck.get_time - (16 * 3600 * 1000))).format('HH:mm:ss.SSS')}`, true);
    decks[deckNr].phases.setContent(`${deck.get_filepath}`, true);
  }

  createText (document, id, options) {
    return new termkit.Text({ parent: document.elements[id], ...defaultTextProps, ...options });
  }

  createTextBox (document, id, options = {}) {
    return new termkit.TextBox({ contentHasMarkup: true, parent: document.elements[id], width: 1000, height: 1000, wordwrap: true, x: 1, y: 0, ...defaultTextProps, ...options });
  }

  waitForUserInput () {
    term.on('key', (key) => {
      switch (key) {
        case 'q':
          this.quit();
          break;
        case 't':
          this.emit('togglePrimary');
          break;
        case 'r':
          this.emit('resync');
          break;
        case 'd':
          this.emit('debug');
          break;
      }
    });

    term.hideCursor();
    term.grabInput({ focus: true });
  }

  quit () {
    term.grabInput(false);
    term.hideCursor(false);
    term.styleReset();
    term.clear();
    term.processExit();
  }

  trueFalseColor (value) {
    return value ? '^gtrue' : '^rfalse';
  }

  toFixedString (num) {
    return (Math.round(num * 100) / 100).toFixed(2);
  }
}
