import { types } from 'mobx-state-tree';

const virtuaDJDeckType = types.model('VirtualDJDeck', {
  firstbeat: types.optional(types.number, 0),
  get_beatpos: types.optional(types.number, 0),
  get_bpm: types.optional(types.number, 0),
  get_year: types.optional(types.number, 0),
  get_filepath: types.optional(types.string, ''),
  get_loop: types.optional(types.number, 0),
  get_text: types.optional(types.string, ''),
  get_time: types.optional(types.number, 0),
  get_artist: types.optional(types.string, ''),
  get_title: types.optional(types.string, ''),
  get_composer: types.optional(types.string, ''),
  get_genre: types.optional(types.string, ''),
  get_album: types.optional(types.string, ''),
  level: types.optional(types.number, 0),
  loop: types.optional(types.string, ''),
  loop_roll: types.optional(types.number, 0),
  play: types.optional(types.string, ''),
  get_limiter: types.optional(types.number, 0),
  masterdeck: types.optional(types.string, ''),
  beatsFromBeginningOfSong: types.optional(types.number, 0),
  beatsFromEndOfSong: types.optional(types.number, 0),
  beatsFromBeginningOfPhase: types.optional(types.number, 0),
  beatsFromEndOfPhase: types.optional(types.number, 0),
  barsFromBeginningOfSong: types.optional(types.number, 0),
  barsFromEndOfSong: types.optional(types.number, 0),
  barsFromBeginningOfPhase: types.optional(types.number, 0),
  barsFromEndOfPhase: types.optional(types.number, 0),
  phase: types.optional(types.string, ''),
  nextPhase: types.optional(types.string, ''),
  previousPhase: types.optional(types.string, '')
});

const virtualDJStatusType = types.model('VirtualDJStatus', {
  get_beat: types.optional(types.number, 0),
  get_beat2: types.optional(types.number, 0),
  crossfader: types.optional(types.number, 0),
  master_volume: types.optional(types.number, 0),
  masterdeck: types.optional(types.number, 0),
  get_limiter: types.optional(types.number, 0),
  get_vdj_folder: types.optional(types.string, '')
});

const statusType = types.model('Status', {
  masterDeck: types.number = 0,
  mainBPM: types.number = 0,
  mainBeatPos: types.number = 0,
  mainBeat: types.number = 0,
  mainPhase: types.number = 0,
  mainBeatPosAhead: types.number = 0,
  mainBeatAhead: types.number = 0,
  mainPhaseAhead: types.number = 0,
  virtualDJOrPioneer: types.boolean = true,
  pioneerProDJLink: types.boolean = false,
  soundSwitchOS2L: types.boolean = false,
  virtualDJOS2L: types.boolean = false,
  streamDeck: types.boolean = false,
  resolumeWeb: types.boolean = false,
  abletonForSync: types.boolean = false,
  abletonLinks: types.number = 0,
  logLines: types.array(types.string)
});

export const status = statusType.create();
export const virtualDJStatus = virtualDJStatusType.create();
export const virtualDJDecks = [
  virtuaDJDeckType.create(),
  virtuaDJDeckType.create()];

export const pioneerDecks = [
  virtuaDJDeckType.create(),
  virtuaDJDeckType.create()];
