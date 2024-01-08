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
  get_artist_title: types.optional(types.string, ''),
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
  phase: types.optional(types.string, '')
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
  soundSwitchOS2L: types.boolean = false,
  virtualDJOS2L: types.boolean = false,
  resolumeWeb: types.boolean = false,
  logLines: types.array(types.string)
});

export const status = statusType.create();
export const virtualDJStatus = virtualDJStatusType.create();
export const virtualDJDecks = [
  virtuaDJDeckType.create(),
  virtuaDJDeckType.create(),
  virtuaDJDeckType.create(),
  virtuaDJDeckType.create()];
