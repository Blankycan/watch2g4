var app = new Vue({
  el: '#app',
  mixins: [ webSocket, videoPlayer ],
  data: {
    username: username,
    uuid: uuid,
    videoSearch: "https://www.youtube.com/watch?v=DcJFdCmN98s",
    queue: [],
    currentIndex: 0,
    users: [],
    editUsername: false
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

      // Receive inital userdata for yourself
      if(data.type === "userdata") {
        console.log("userdata:", data.data);
        // Update UUID if we got a new one
        if(this.uuid != data.data.uuid) {
          this.uuid = data.data.uuid;
          $.post('/setUuid', {
            uuid: this.uuid
          }, (data, status) => {
            console.log(`${data} and status is ${status}`);
          });
        }
      }

      // Handle updated userlist
      else if(data.type === "userlist") {
        console.log("userlist:", data.users);
        // Sort users so you are first
        this.users = data.users.sort((a, b) => {
          return (a.uuid === this.uuid) ? -1 : (b.uuid === this.uuid) ? 1 : 0;
        });
      }

      // Handle video search event
      else if(data.type === "search") {
        this.loadVideo(data.data);
      }
      else if(data.type === "playQueuedVideo") {
        console.log(`set ${this.currentIndex} to active false and ${data.queueIndex} to active`)
        this.queue[this.currentIndex].active = false
        this.currentIndex = data.queueIndex
        this.queue[this.currentIndex].active = true
        Vue.set(this.queue, this.currentIndex, this.queue[this.currentIndex])

        this.loadVideo(this.queue[this.currentIndex]['url'])
      }

      // Handle video queue event
      else if(data.type === "queue") {
        console.log("Queued a new video")
        if (data.initial && this.queue.length === 0) {
          this.queue.push(data)
        } else if(data.initial === undefined){
          this.queue.push(data)
        }
      }

      // Handle sync queue
      else if(data.type === "syncQueue") {
        console.log("Syncing queue")
        this.queue = data.queue
        this.currentIndex = data.currentIndex
      }
      
      // This is received when a new client asks for the current state
      else if(data.type === "syncState") {
        console.log("New client asked for state")
        this.sendState(data.receiver)
      }
      // This is received on the new client after an old one sends syncState
      else if(data.type === "stateUpdate") {
        console.log("Received stateUpdate")
        this.queue = data.queue
        this.currentIndex = data.currentIndex
        if (data.currentIndex !== 0){
          this.queue[0].active = false
        }
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
        originalUrl: originalUrl,
        active: false
      }
      this.socket.send(JSON.stringify(msg));
      this.videoSearch = ""
    },
    /**
     * Sends an event to all users to add the video to their queue
     */
    playQueuedVideo: function(index) {
      // Pass this search query to the server
      let msg = {
        type: 'playQueuedVideo',
        queueIndex: index
      }
      this.socket.send(JSON.stringify(msg));
      
    },
    /**
     * Sends an event to all users to add the video to their queue
     */
    removeQueuedVideo: function(index) {
      // Pass this search query to the server
      this.currentIndex -= index < this.currentIndex ? 1 : 0
      this.queue.splice(index, 1)
      let msg = {
        type: 'syncQueue',
        queue: this.queue,
        currentIndex: this.currentIndex
      }
      this.socket.send(JSON.stringify(msg));
      
    },
    /**
     * Sends an event to all users to add the video to their queue
     */
    sendState: function(receiver) {
      msg = {
        type: 'syncState',
        receiver: receiver,
        queue: this.queue,
        currentIndex: this.currentIndex
      }
      this.socket.send(JSON.stringify(msg));

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
    },
    /**
     * Update the username.
     */
    changeUsername: function() {
      this.editUsername = false;

      // Make sure that the username differs
      if(this.username !== this.users[0].username) {
        this.send(JSON.stringify({
          type: "rename",
          username: this.username,
          uuid: this.uuid
        }));
        $.post('/setUsername', {
          username: this.username
        }, (data, status) => {
          console.log(`${data} and status is ${status}`);
        });
      }
    }
  },
  directives: {
    focus: {
      inserted(el) {
        el.focus();
      }
    }
  }
});

