var app = new Vue({
  el: '#app',
  mixins: [ webSocket, videoPlayer ],
  data: {
    videoSearch: "https://www.youtube.com/watch?v=DcJFdCmN98s",
    queue: []
  },
  methods: {
    /**
     * Handle message received from the WebSocket.
     */
    onMessage: function(inMessage) {
      console.log("onMessage:", inMessage);
      // Parse the message data to a JSON object
      let data = {};
      try {
        data = JSON.parse(inMessage.data);
      }
      catch(e) {
        console.log("Failed to parse message.");
      }

      // Handle video search event
      if(data.type === "search") {
        this.loadVideo(data.data);
      }

      // Handle video queue event
      if(data.type === "queue") {
        console.log("Queued a new video")
        this.queue.push(data)
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
    processYTUrl: function() {
      let search = this.videoSearch;
      if(search.includes('/watch?v=')) {
        search = search.replace('/watch?v=', '/v/');
      }
      if(!search.includes('version=3')) {
        // Remove trailing trash and append the '?version=3'
        search = search.split('&')[0];
        search += "?version=3";
      }
      console.log(search)
      this.videoSearch = search
    },
    /**
     * Sends an event to all users to load the video specified in the searchbox
     */
    searchVideo: function() {
      this.processYTUrl()

      // Pass this search query to the server
      let msg = {
        type: 'search',
        data: this.videoSearch
      }
      this.socket.send(JSON.stringify(msg));
      this.videoSearch = ""
    },
    /**
     * Sends an event to all users to add the video to their queue
     */
    queueVideo: function() {
      const originalUrl = this.videoSearch
      this.processYTUrl()

      // Pass this search query to the server
      let msg = {
        type: 'queue',
        url: this.videoSearch,
        originalUrl: originalUrl
      }
      this.socket.send(JSON.stringify(msg));
      this.videoSearch = ""
    },
    /**
     * Sends an event to all users to add the video to their queue
     */
    playQueuedVideo: function(index) {
      const vid = this.queue[index]
      // Pass this search query to the server
      let msg = {
        type: 'search',
        data: vid['url']
      }
      this.socket.send(JSON.stringify(msg));
      console.log(index)
      this.queue.splice(index, 1)
    },
    /**
     * Sample function to load 2 videos to the queue
     */
    fillqueue: function() {
      let url = "https://www.youtube.com/v/RMvt13PtV5I?version=3"
      let origVid = "https://www.youtube.com/watch?v=RMvt13PtV5I"
      // Pass this search query to the server
      let msg = {
        type: 'queue',
        url: url,
        originalUrl: origVid      
      }
      this.socket.send(JSON.stringify(msg));
  
      url = "https://www.youtube.com/v/G2e_M06YDyY?version=3"
      origVid = "https://www.youtube.com/watch?v=G2e_M06YDyY"
      // Pass this search query to the server
      msg = {
        type: 'queue',
        url: url,
        originalUrl: origVid      
      }
      this.socket.send(JSON.stringify(msg));

      url = "https://www.youtube.com/v/1bt-FHaFVH8?version=3"
      origVid = "https://www.youtube.com/watch?v=1bt-FHaFVH8"
      // Pass this search query to the server
      msg = {
        type: 'queue',
        url: url,
        originalUrl: origVid      
      }
      this.socket.send(JSON.stringify(msg));
    }
  }
});

