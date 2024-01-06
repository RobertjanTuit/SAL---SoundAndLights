/* eslint-disable no-new */
import termkit from 'terminal-kit';
import moment from 'moment';
import { names } from '../constants.js';
import { onSnapshot } from 'mobx-state-tree';
import * as stores from '../stores.js';
import { Logger } from '../core/Logger.js';
import EventEmitter2 from 'eventemitter2';
export const term = termkit.terminal;

const version = process.env.npm_package_version;
const defaultTextProps = { leftPadding: ' ', rightPadding: ' ', attr: { contentHasMarkup: true } };

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
    this.soundSwitchtatusText = this.createText(document, names.statusSoundswitchO2L);
    this.virtualDJStatusText = this.createText(document, names.statusVirtualDJO2L);
    this.resolumeOSCText = this.createText(document, names.statusResolumeOSC);

    this.vdjDecks = [{}, {}];
    this.vdjDecks[0].text = this.createText(document, names.vdjDeck1, { x: 1, y: 0 });
    this.vdjDecks[0].level = this.createText(document, names.vdjDeck1, { x: 1, y: 1, width: 5 });
    this.vdjDecks[0].bpm = this.createText(document, names.vdjDeck1, { x: 6, y: 1, width: 5 });
    this.vdjDecks[0].beatPos = this.createText(document, names.vdjDeck1, { x: 13, y: 1, width: 5 });
    this.vdjDecks[0].elapsed = this.createText(document, names.vdjDeck1, { x: 21, y: 1, width: 8 });

    this.vdjDecks[1].text = this.createText(document, names.vdjDeck2, { x: 1, y: 0 });
    this.vdjDecks[1].level = this.createText(document, names.vdjDeck2, { x: 1, y: 1, width: 5 });
    this.vdjDecks[1].bpm = this.createText(document, names.vdjDeck2, { x: 6, y: 1, width: 5 });
    this.vdjDecks[1].beatPos = this.createText(document, names.vdjDeck2, { x: 13, y: 1, width: 5 });
    this.vdjDecks[1].elapsed = this.createText(document, names.vdjDeck2, { x: 21, y: 1, width: 8 });

    this.logText = this.createTextBox(document, names.log, '');
    this.commandsText = this.createText(document, names.commands, { content: '^gQ^wuit | ^gF^wix Connected Apps | Toggle ^gL^wog |', contentHasMarkup: true });

    onSnapshot(stores.status, (snapshot) => {
      this.updateTerminalFromStatus(snapshot);
    });
    onSnapshot(stores.virtualDJDecks[0], (snapshot) => {
      this.updateTerminalFromVDJDeck1(snapshot);
    });
    onSnapshot(stores.virtualDJDecks[1], (snapshot) => {
      this.updateTerminalFromVDJDeck2(snapshot);
    });

    this.updateTerminalFromStatus(stores.status);
    this.updateTerminalFromVDJDeck1(stores.virtualDJDecks[0]);
    this.updateTerminalFromVDJDeck2(stores.virtualDJDecks[1]);
    this.updateFps(30);
  }

  updateTerminalFromStatus (globalStatus) {
    this.soundSwitchtatusText.setContent(`Soundswitch OS2L: ${this.trueFalseColor(globalStatus.soundSwitchOS2L)}`, true);
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
    this.updateDeck(0, deck);
  }

  updateTerminalFromVDJDeck2 (deck) {
    this.updateDeck(1, deck);
  }

  updateFps (fps) {
    if (this.lastFps !== fps) {
      this.lastFps = fps;
      this.fpsText.setContent(`^y${Math.round(fps)}`, true);
    }
  }

  updateDeck (deckNr, deck) {
    this.vdjDecks[deckNr].text.setContent(`${deck.get_filepath}`, true);
    this.vdjDecks[deckNr].level.setContent(`${this.toFixedString(deck.level, 2)}`, true);
    this.vdjDecks[deckNr].bpm.setContent(`${this.toFixedString(deck.get_bpm)}`, true);
    this.vdjDecks[deckNr].beatPos.setContent(`${this.toFixedString(deck.get_beatpos, 2)}`, true);
    // TODO: Use better method to turn timestamp into string, can go into negative as well
    this.vdjDecks[deckNr].elapsed.setContent(`${moment(Math.max(deck.get_time - (16 * 3600 * 1000))).format('HH:mm:ss.SSS')}`, true);
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
        case 'f':
          this.emit('fixConnectedApps');
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
