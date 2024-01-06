export class VirtualDJSoundSwitchBridge {
  subscribedVerbs = [
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
    'deck 1 get_artist_title',
    'deck 2 get_artist_title',
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

  constructor (statusStore, soundswitchClient, virtualDJServer) {
    this.statusStore = statusStore;
    this.soundswitchClient = soundswitchClient;
    this.virtualDJServer = virtualDJServer;
    this.bufferedClientMessages = [];

    this.soundswitchClient.on('connected', () => {
      this.virtualDJServer.start();
    });
    this.soundswitchClient.on('closed', () => {
      this.bufferedClientMessages.length = 0;
      this.virtualDJServer.stop();
    });
    this.soundswitchClient.on('data', (data) => {
      this.bufferedClientMessages.push(data);
    });

    this.virtualDJServer.on('connected', () => {
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
    this.virtualDJServer.on('data', (data) => {
      this.soundswitchClient.send(data);
    });
  }
}
