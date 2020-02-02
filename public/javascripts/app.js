var app = new Vue({
  el: '#app',
  data: {
    socket: null,
    timesync: null,
    player: null,
    videoSearch: "https://www.youtube.com/watch?v=S-8U4lSEq8A",
    playing: false,
    lastVideoTime: 0,
    lastTimestamp: 0,
    playSync: null,
    syncCount: 0
  },
  created() {
    this.timesync = timesync.create({
      server: '/timesync',
      interval: 10000
    });

    this.timesync.on('change', function(offset) {
      console.log("Changed offset:", offset, "ms");
    });

    let localhost = "ws://192.168.1.102:3031";
    let external = "wss://2g4ws.blankycan.com";
    this.socket = new WebSocket((window.location.host.includes(':3030')) ? localhost : external);

    this.socket.addEventListener('open', function(event) {
      let msg = {
        type: "connect",
        data: "Username"
      };
      app.socket.send(JSON.stringify(msg));
    });

    this.socket.addEventListener('message', this.onMessage);
  },
  methods: {
    onMessage: function(inMessage) {
      console.log("onMessage:", inMessage);
      let data = {};
      try {
        data = JSON.parse(inMessage.data);
      }
      catch(e) {
        console.log("Failed to parse message.");
      }

      if(data.type === "search") {
        this.doSearch(data.data);
      }
      else if(data.type === "playback") {
        this.lastVideoTime = data.time;
        this.lastTimestamp = data.timestamp;
        if(data.action === "play") {
          this.doPlay(this.calculateVideoTime());
          this.setupPlaySync();
        }
        else if(data.action === "pause") {
          this.doPause(data.time);
        }
      }
    },
    calculateVideoTime: function() {
      let now = (new Date(this.timesync.now())).getTime();
      let diff = (now - this.lastTimestamp) / 1000.0
      console.log("Timediff is:", diff, 'seconds');
      this.lastVideoTime = this.lastVideoTime + diff;
      this.lastTimestamp = now;
      return this.lastVideoTime;
    },
    searchVideo: function() {
      let search = this.videoSearch;
      if(search.includes('/watch?v=')) {
        search = search.replace('/watch?v=', '/v/');
      }
      if(!search.includes('version=3')) {
        search += (search.includes('?')) ? '&' : '?';
        search += "version=3";
      }

      let msg = {
        type: 'search',
        data: search
      }
      this.socket.send(JSON.stringify(msg));

    },
    // 3. This function creates an <iframe> (and YouTube player)
    //    after the API code downloads.
    onYouTubeIFrameAPIReady: function() {
      console.log("IN HERE");
      this.player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: 'FQRsakvoe8w',
        playerVars: { 'autoplay': 0 },
        events: {
          'onReady': this.onPlayerReady,
          'onStateChange': this.onPlayerStateChange
        }
      });
    },
    // 4. The API will call this function when the video player is ready.
    onPlayerReady: function(event) {
      console.log("onPLayerReady");
      this.doStop();
    },
    onPlayerStateChange: function(event) {
      console.log(event);
      if(event.data == YT.PlayerState.ENDED) {
        console.log("ENDED");
      }
      else if(event.data == YT.PlayerState.PLAYING) {
        console.log("PLAYING");
        if(!this.playing) {
          this.lastVideoTime = this.player.getCurrentTime();
          this.lastTimestamp = (new Date(this.timesync.now())).getTime();
          let msg = {
            type: 'playback',
            action: 'play',
            time: this.lastVideoTime,
            timestamp: this.lastTimestamp
          }
          this.socket.send(JSON.stringify(msg));
          this.setupPlaySync();
        }
        this.playing = true;
      }
      else if(event.data == YT.PlayerState.PAUSED) {
        console.log("PAUSED");
        if(this.playing) {
          let msg = {
            type: 'playback',
            action: 'pause',
            time: this.player.getCurrentTime(),
            timestamp: (new Date(this.timesync.now())).getTime()
          }
          this.socket.send(JSON.stringify(msg));
        }
        this.playing = false;
      }
      else if(event.data == YT.PlayerState.BUFFERING) {
        console.log("BUFFERING");
        if(!this.playing) {
          let msg = {
            type: 'playback',
            action: 'play',
            time: this.player.getCurrentTime(),
            timestamp: (new Date(this.timesync.now())).getTime()
          }
          this.socket.send(JSON.stringify(msg));
        }
      }
      else if(event.data == YT.PlayerState.CUED) {
        console.log("CUED");
      }
      else {
        console.log("Other event change", event);
      }
    },
    setupPlaySync: function() {
      if(this.playSync) {
        clearInterval(this.playSync);
      }
      this.syncCount = 5;
      this.playSync = setInterval(this.syncPlayTime, 200);
    },
    syncPlayTime: function() {
      console.log("syncPlayTime", this.syncCount, this.playSync);
      if(this.playing && this.syncCount-- > 0){
        this.player.seekTo(this.calculateVideoTime());
      }
      else {
        if(this.playSync) {
          clearInterval(this.playSync);
        }
      }
    },
    doSearch: function(inUrl) {
      console.log("doSearch:", inUrl);
      this.player.loadVideoByUrl(inUrl, 0)
    },
    doPlay: function(inTime) {
      console.log("PlayVideo", inTime);
      this.playing = true;
      this.player.playVideo();
      this.player.seekTo(inTime, true);
    },
    doPause: function(inTime) {
      console.log("StopVideo", inTime);
      this.playing = false;
      this.player.pauseVideo();
      this.player.seekTo(inTime, true);
    },
    doStop: function(inTime) {
      console.log("StopVideo", inTime);
      this.playing = false;
      this.player.stopVideo();
    }
  },
  mounted() {
    console.log("MOUNTED");
  }
});
