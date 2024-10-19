export class VirtualDJSoundSwitchBridge {
  subscribedVerbs = [
    "deck 1 get_text '%SOUNDSWITCH_ID'",
    "deck 2 get_text '%SOUNDSWITCH_ID'",
    "deck 3 get_text '%SOUNDSWITCH_ID'",
    "deck 4 get_text '%SOUNDSWITCH_ID'",
    'deck 1 get_filepath',
    'deck 2 get_filepath',
    'deck 3 get_filepath',
    'deck 4 get_filepath',
    'deck 1 level',
    'deck 2 level',
    'deck 3 level',
    'deck 4 level',
    'crossfader',
    'deck 1 get_time elapsed absolute',
    'deck 2 get_time elapsed absolute',
    'deck 3 get_time elapsed absolute',
    'deck 4 get_time elapsed absolute',
    'deck 1 get_beatpos',
    'deck 2 get_beatpos',
    'deck 3 get_beatpos',
    'deck 4 get_beatpos',
    'deck 1 get_firstbeat',
    'deck 2 get_firstbeat',
    'deck 3 get_firstbeat',
    'deck 4 get_firstbeat',
    'deck 1 get_bpm',
    'deck 2 get_bpm',
    'deck 3 get_bpm',
    'deck 4 get_bpm',
    'deck 1 play',
    'deck 2 play',
    'deck 3 play',
    'deck 4 play',
    'deck 1 loop',
    'deck 2 loop',
    'deck 3 loop',
    'deck 4 loop',
    'deck 1 get_loop',
    'deck 2 get_loop',
    'deck 3 get_loop',
    'deck 4 get_loop',
    'deck 1 loop_roll 0.03125 ? constant 0.03125 : deck 1 loop_roll 0.0625 ? constant 0.0625 : deck 1 loop_roll 0.125 ? constant 0.125 : deck 1 loop_roll 0.25 ? constant 0.25 : deck 1 loop_roll 0.5 ? constant 0.5 : deck 1 loop_roll 0.75 ? constant 0.75 : deck 1 loop_roll 1 ? constant 1 : deck 1 loop_roll 2 ? constant 2 : deck 1 loop_roll 4 ? constant 4 : constant 0',
    'deck 2 loop_roll 0.03125 ? constant 0.03125 : deck 2 loop_roll 0.0625 ? constant 0.0625 : deck 2 loop_roll 0.125 ? constant 0.125 : deck 2 loop_roll 0.25 ? constant 0.25 : deck 2 loop_roll 0.5 ? constant 0.5 : deck 2 loop_roll 0.75 ? constant 0.75 : deck 2 loop_roll 1 ? constant 1 : deck 2 loop_roll 2 ? constant 2 : deck 2 loop_roll 4 ? constant 4 : constant 0',
    'deck 3 loop_roll 0.03125 ? constant 0.03125 : deck 3 loop_roll 0.0625 ? constant 0.0625 : deck 3 loop_roll 0.125 ? constant 0.125 : deck 3 loop_roll 0.25 ? constant 0.25 : deck 3 loop_roll 0.5 ? constant 0.5 : deck 3 loop_roll 0.75 ? constant 0.75 : deck 3 loop_roll 1 ? constant 1 : deck 3 loop_roll 2 ? constant 2 : deck 3 loop_roll 4 ? constant 4 : constant 0',
    'deck 4 loop_roll 0.03125 ? constant 0.03125 : deck 4 loop_roll 0.0625 ? constant 0.0625 : deck 4 loop_roll 0.125 ? constant 0.125 : deck 4 loop_roll 0.25 ? constant 0.25 : deck 4 loop_roll 0.5 ? constant 0.5 : deck 4 loop_roll 0.75 ? constant 0.75 : deck 4 loop_roll 1 ? constant 1 : deck 4 loop_roll 2 ? constant 2 : deck 4 loop_roll 4 ? constant 4 : constant 0',
    'master_volume',
    'masterdeck_auto',
    'deck 1 get_limiter',
    'deck 2 get_limiter',
    'deck 1 masterdeck',
    'deck 2 masterdeck',
    'get_limiter "master"',
    'get_beat',
    'get_beat2',
    'masterdeck_auto',
    'deck 1 get_title',
    'deck 1 get_artist',
    'deck 2 get_title',
    'deck 2 get_artist',
    'deck 1 get_album',
    'deck 2 get_album',
    'deck 1 get_genre',
    'deck 2 get_genre',
    'deck 1 get_composer',
    'deck 2 get_composer',
    'deck 1 get_year',
    'deck 2 get_year',
    'get_vdj_folder'
  ];

  constructor (statusStore, virtualDJServer) {
    this.statusStore = statusStore;
    this.virtualDJServer = virtualDJServer;
  }

  start () {
    this.bufferedClientMessages = [];

    this.virtualDJServer.on('connected', () => {
      this.virtualDJServer.send({ evt: 'subscribe', trigger: this.subscribedVerbs });
      let subscribeEvt = false;
      for (let i = 0; i < this.bufferedClientMessages.length; i++) {
        const data = this.bufferedClientMessages[i];
        if (data.evt === 'subscribe') {
          subscribeEvt = true;
          data.trigger.push(...this.subscribedVerbs);
        }
        this.virtualDJServer.send(this.bufferedClientMessages[i]);
      }

      if (!subscribeEvt) {
        // Get Event from disk and send it to SoundSwitch
      }
    });
  }
}
