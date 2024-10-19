import EventEmitter2 from 'eventemitter2';
import { onSnapshot } from 'mobx-state-tree';
import { virtualDJStatus } from '../stores.js';
import path from 'path';
import convert from 'xml-js';
import os from 'os';
import { existsSync, statSync, watch } from 'fs';
import { Logger } from '../core/Logger.js';
import drivelist from 'drivelist';
import networkDrive from 'windows-network-drive';
import { readFile, mkdir } from 'fs/promises';
import { writeJSON } from '../utils.js';

export class SongCatalog extends EventEmitter2 {
  songs = {};
  databases = {};
  logger = new Logger('SongCatalog');
  constructor ({ reloadOnChange, logToDisk }) {
    super({ wildcard: true, ignoreErrors: true });
    this.logToDisk = logToDisk;
    this.reloadOnChange = reloadOnChange;
  }

  async init () {
    onSnapshot(virtualDJStatus, (snapshot) => {
      if (snapshot.get_vdj_folder !== '') {
        this.processVirtualDJPath(snapshot.get_vdj_folder);
      }
    });

    const userHomeDir = os.homedir();
    this.processVirtualDJPath(path.join(userHomeDir, 'AppData\\Local\\VirtualDJ'));
    this.processVirtualDJPath(path.join(userHomeDir, 'OneDrive\\Documenten\\VirtualDJ'));

    const drives = await drivelist.list();
    for (const drive of drives) {
      if (drive.mountpoints.length > 0) {
        const mountpoint = drive.mountpoints[0].path;
        this.processVirtualDJPath(path.join(mountpoint, 'VirtualDJ'));
      }
    }

    networkDrive.list().then((drives) => {
      for (const [, driveData] of Object.entries(drives)) {
        this.processVirtualDJPath(path.join(`${driveData.driveLetter}:\\`, 'VirtualDJ'));
      }
    });
  }

  errorRegex = /Database in (.*?) could not be opened!/gm;
  async checkForVDJErrors (path) {
    if (existsSync(path + '\\systemreport.txt')) {
      const fileData = (await readFile(path + '\\systemreport.txt')).toString();
      const errorMatch = fileData.match(this.errorRegex);
      if (errorMatch) {
        console.error('VDJ-ERROR: ', errorMatch);
      }
    }
  }

  async writeSongDatabaseLog () {
    if (!this.logToDisk) return;

    try {
      if (!existsSync('songData')) {
        await mkdir('songData');
      }
      await writeJSON('songData/songDatabase.json', this.songs);
    } catch (error) {
      this.logger.log(`Error writing song database log: ${error}`);
    }
  }

  async processVirtualDJPath (path) {
    if (existsSync(path)) {
      this.checkForVDJErrors(path);
      const databaseFilePath = path + '\\database.xml';
      if (existsSync(databaseFilePath)) {
        await this.loadFromVirtualDJDatabases(databaseFilePath);
        let changeTimeout = null;
        if (this.reloadOnChange) {
          watch(databaseFilePath, async () => {
            clearTimeout(changeTimeout);
            changeTimeout = setTimeout(() => {
              this.logger.log(`Database changed, reloading...`);
              this.loadFromVirtualDJDatabases(databaseFilePath, true);
            }, 1000);
          }).on('error', (error) => {
            this.logger.log(`Error watching ^b${databaseFilePath}^w | ^r${error}`);
          });
        }
      }
    }
  }

  async loadFromVirtualDJDatabases (databaseFilePath, reload = false) {
    const stats = statSync(databaseFilePath);
    const mtime = stats.mtimeMs;

    if (!this.databases[databaseFilePath] || this.databases[databaseFilePath] !== mtime || reload) {
      this.databases[databaseFilePath] = mtime;
      this.logger.log(`Loading VDJ database from ^g ${databaseFilePath} @ ${mtime}`);
      const fileData = await readFile(databaseFilePath);
      const json = JSON.parse(convert.xml2json(fileData, { compact: true }));
      let loadedSongs = 0;
      json.VirtualDJ_Database.Song.forEach((songElement) => {
        const filePath = songElement._attributes.FilePath;
        const song = {
          filePath,
          artist: songElement.Tags?._attributes.Author,
          title: songElement.Tags?._attributes.Title,
          album: songElement.Tags?._attributes.Album,
          trackNumber: songElement.Tags?._attributes.TrackNumber,
          year: songElement.Tags?._attributes.Year,
          flag: songElement.Tags?._attributes.Flag,
          songLength: songElement.Infos?._attributes.SongLength,
          lastModified: songElement.Infos?._attributes.LastModified,
          albumCover: songElement.Infos?._attributes.Cover,
          poi: []
        };

        if (songElement.Poi?.forEach) {
          songElement.Poi.forEach((poiElement) => {
            song.poi.push({
              name: poiElement._attributes.Name,
              position: poiElement._attributes.Pos,
              type: poiElement._attributes.Type,
              bpm: poiElement._attributes.Bpm,
              point: poiElement._attributes.Point
            });
          });
        }

        loadedSongs++;
        this.songs[filePath] = song;
      });
      this.logger.log(`Loaded ${loadedSongs} songs.`);
    }
    this.writeSongDatabaseLog();
  }

  filterSongs (filter) {
    const songs = [];
    Object.entries(this.songs).forEach(([, song]) => {
      if (filter(song)) {
        songs.push(song);
      }
    });
    return songs;
  }

  getSongByArtistTitle (artist, title) {
    const songsFound = this.filterSongs((song) => song.artist === artist && song.title === title);
    if (songsFound.length > 1) {
      this.logger.log(`Multiple songs found for ${artist} - ${title}`);
    } else if (songsFound.length === 0) {
      return null;
    } else {
      return songsFound[0];
    }
  }

  getSong (filePath, artist, title) {
    const song = this.songs[filePath];
    return song != null ? song : this.getSongByArtistTitle(artist, title);
  }
}
