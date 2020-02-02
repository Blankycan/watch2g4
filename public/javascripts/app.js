var app = new Vue({
  el: '#app',
  mixins: [ webSocket, videoPlayer ],
  data: {
    username: username,
    uuid: uuid,
    videoSearch: "https://www.youtube.com/watch?v=S-8U4lSEq8A",
    users: []
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
    },
    /**
     * Update the username.
     */
    changeUsername: function() {
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
});
