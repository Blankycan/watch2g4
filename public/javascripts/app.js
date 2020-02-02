let webSocketServer = "wss://<insert.address.of.websocket.server>";

var app = new Vue({
  el: '#app',
  mixins: [ videoPlayer ],
  data: {
    socket: null,
    timesync: null,
    videoSearch: "https://www.youtube.com/watch?v=S-8U4lSEq8A",
  },
  created() {
    // Setup the TimeSync
    this.timesync = timesync.create({
      server: '/timesync',
      interval: 10000
    });

    this.timesync.on('change', function(offset) {
      console.log("Changed offset:", offset, "ms");
    });

    // Setup the WebSocket towards our video server
    this.socket = new WebSocket(webSocketServer);

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
    /**
     * Handle message received from the WebSocket.
     */
    onMessage: function(inMessage) {
      console.log("onMessage:", inMessage);
      let data = {};
      try {
        data = JSON.parse(inMessage.data);
      }
      catch(e) {
        console.log("Failed to parse message.");
      }

      // Handle video search event
      if(data.type === "search") {
        this.doSearch(data.data);
      }
      // Handle a Playback event
      else if(data.type === "playback") {
        this.lastVideoTime = data.time;
        this.lastTimestamp = data.timestamp;

        // Play
        if(data.action === "play") {
          this.doPlay(this.calculateVideoTime());
          this.setupPlaySync();
        }

        // Pause
        else if(data.action === "pause") {
          this.doPause(data.time);
        }
      }
    },
    /**
     * Do a very crude modification to given YouTube links to make them work
     * with the YouTube Player API.
     * Needs to be in format: http://www.youtube.com/v/VIDEO_ID?version=3
     */
    searchVideo: function() {
      let search = this.videoSearch;
      if(search.includes('/watch?v=')) {
        search = search.replace('/watch?v=', '/v/');
      }
      if(!search.includes('version=3')) {
        // Remove trailing trash and append the '?version=3'
        search = search.split('&')[0];
        search += "?version=3";
      }

      // Pass this search query to the server
      let msg = {
        type: 'search',
        data: search
      }
      this.socket.send(JSON.stringify(msg));
    }
  }
});
