import EventEmitter2 from 'eventemitter2';
import { windowManager } from 'node-window-manager';
import { Logger } from './Logger.js';
import * as child from 'child_process';
import util from 'util';
import path from 'path';
const exec = util.promisify(child.exec);

export const AppNames = {
  resolume: 'resolume',
  soundSwitch: 'soundSwitch',
  virtualDJ: 'virtualDJ'
};

export class ProcessManager extends EventEmitter2 {
  logger = new Logger('ProcessManager');

  isRunning = {
    [AppNames.resolume]: null,
    [AppNames.soundSwitch]: null,
    [AppNames.virtualDJ]: null
  };

  constructor (appsConfig) {
    super({ wildcard: true, ignoreErrors: true });
    this.appsConfig = appsConfig;
  }

  start () {
    this.checkForProcesses();
  }

  async killProcess (appName) {
    const process = path.basename(this.getProcess(appName));
    try {
      await exec(`taskkill /f /im ${process}`, { ignoreErrors: true });
    } catch (err) {
      this.logger.log(`Error killing process ${process}: ${err}`);
    }
  }

  async startProcess (appName, onlyIfNotRunning = false) {
    if (onlyIfNotRunning && this.isRunning[appName]) {
      return;
    }

    const process = `"${this.getProcess(appName)}"`;
    try {
      exec(process);
    } catch (err) {
      this.logger.log(`Error starting process ${process}: ${err}`);
    }
  }

  async closeConnectedApps (soundSwitch, virtualDJ, resolume) {
    if (virtualDJ && this.isRunning[AppNames.virtualDJ]) {
      await this.killProcess(AppNames.virtualDJ);
    }
    if (soundSwitch && this.isRunning[AppNames.soundSwitch]) {
      await this.killProcess(AppNames.soundSwitch);
    }
    if (resolume && this.isRunning[AppNames.resolume]) {
      await this.killProcess(AppNames.resolume);
    }
  }

  async startConnectedApps () {
    if (!this.isRunning[AppNames.resolume]) {
      this.startProcess(AppNames.resolume);
    }
    if (!this.isRunning[AppNames.soundSwitch]) {
      this.startProcess(AppNames.soundSwitch);
      const minimizeInterval = setInterval(() => {
        windowManager.getWindows().forEach((window) => {
          if (window.getTitle() === 'SoundSwitch') {
            window.minimize();
            clearTimeout(minimizeInterval);
          }
        });
      }, 500);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.startProcess(AppNames.virtualDJ, true);
  }

  getProcess (appName) {
    let process = null;
    switch (appName) {
      case AppNames.resolume:
        process = this.appsConfig.resolume.process;
        break;
      case AppNames.soundSwitch:
        process = this.appsConfig.soundSwitch.process;
        break;
      case AppNames.virtualDJ:
        process = this.appsConfig.virtualDJ.process;
        break;
    }
    return process;
  }

  checkForProcesses () {
    let resolume = false;
    let soundSwitch = false;
    let virtualDJ = false;
    windowManager.getWindows().forEach((window) => {
      if (window.path === this.appsConfig.virtualDJ.process) {
        virtualDJ = true;
      }
      if (window.path === this.appsConfig.soundSwitch.process) {
        soundSwitch = true;
      }
      if (window.path === this.appsConfig.resolume.process) {
        resolume = true;
      }
    });

    if (this.isRunning[AppNames.resolume] !== resolume) {
      this.isRunning[AppNames.resolume] = resolume;
      if (resolume) {
        this.emit('running', AppNames.resolume);
      } else {
        this.emit('notrunning', AppNames.resolume);
      }
    }

    if (this.isRunning[AppNames.soundSwitch] !== soundSwitch) {
      this.isRunning[AppNames.soundSwitch] = soundSwitch;
      if (soundSwitch) {
        this.emit('running', AppNames.soundSwitch);
      } else {
        this.emit('notrunning', AppNames.soundSwitch);
      }
    }

    if (this.isRunning[AppNames.virtualDJ] !== virtualDJ) {
      this.isRunning[AppNames.virtualDJ] = virtualDJ;
      if (virtualDJ) {
        this.emit('running', AppNames.virtualDJ);
      } else {
        this.emit('notrunning', AppNames.virtualDJ);
      }
    }

    setTimeout(() => {
      this.checkForProcesses();
    }, 1000);
  }
}
