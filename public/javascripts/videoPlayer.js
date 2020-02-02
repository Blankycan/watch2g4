var videoPlayer = {
  el: '#app',
  data: function() {
    return {
      player: null,
      playing: false,
      lastVideoTime: 0,
      lastTimestamp: 0,
      timesync: null,
      playSync: null,
      syncCount: 0
    }
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
  },
  methods: {
    /**
     * Calculate what time the video should be on now.
     * @return The time that the video should be on.
     */
    calculateVideoTime: function() {
      let now = (new Date(this.timesync.now())).getTime();
      let diff = (now - this.lastTimestamp) / 1000.0
      console.log("Timediff is:", diff, 'seconds');
      this.lastVideoTime = this.lastVideoTime + diff;
      this.lastTimestamp = now;
      return this.lastVideoTime;
    },
    /**
     * When the YouTube IFrame API is ready, setup the YouTube player in
     * the iframe and connect some events.
     */
    onYouTubeIFrameAPIReady: function() {
      console.log("Setup video player");
      this.player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: 'DcJFdCmN98s',
        playerVars: { 'autoplay': 0 },
        events: {
          'onReady': this.onPlayerReady,
          'onStateChange': this.onPlayerStateChange
        }
      });

      if (this.queue.length == 0) {
        url = "https://www.youtube.com/v/DcJFdCmN98s?version=3"
        origVid = "https://www.youtube.com/watch?v=DcJFdCmN98s"
        msg = {
          type: 'queue',
          initial: true,
          user: uuid,
          url: url,
          originalUrl: origVid,
          active: true      
        }
        this.socket.send(JSON.stringify(msg));
      }
    },
    /**
     * Callback when the Video player is ready after loading a video.
     */
    onPlayerReady: function(event) {
      console.log("onPlayerReady");
      this.doStop();
    },
    /**
     * Callback when the Video player have switched state.
     * This is how we detect that the user have started playing or
     * paused the video, and need to notify all other users through
     * the web socket.
     * @param event The YouTube player state change event.
     */
    onPlayerStateChange: function(event) {
      console.log(event);
      // Video has Ended
      if(event.data == YT.PlayerState.ENDED) {
        console.log("ENDED");
        if (this.currentIndex < this.queue.length - 1){
          this.queue[this.currentIndex].active = false
          this.currentIndex++
          this.queue[this.currentIndex].active = true
          Vue.set(this.queue, this.currentIndex, this.queue[this.currentIndex])
          this.loadVideo(this.queue[this.currentIndex]['url'])
        }
      }
      // Video has started Playing
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
          app.send(JSON.stringify(msg));
          this.setupPlaySync();
        }
        this.playing = true;
      }
      // Video has been Paused
      else if(event.data == YT.PlayerState.PAUSED) {
        console.log("PAUSED");
        if(this.playing) {
          let msg = {
            type: 'playback',
            action: 'pause',
            time: this.player.getCurrentTime(),
            timestamp: (new Date(this.timesync.now())).getTime()
          }
          app.send(JSON.stringify(msg));
        }
        this.playing = false;
      }
      // Video is Buffering
      else if(event.data == YT.PlayerState.BUFFERING) {
        console.log("BUFFERING");
        if(!this.playing) {
          let msg = {
            type: 'playback',
            action: 'play',
            time: this.player.getCurrentTime(),
            timestamp: (new Date(this.timesync.now())).getTime()
          }
          app.send(JSON.stringify(msg));
        }
      }
      // Video has been Cued
      else if(event.data == YT.PlayerState.CUED) {
        console.log("CUED");
      }
      // Unknown
      else {
        console.log("Other event change", event);
      }
    },
    /**
     * Trying to synchronize the YouTube players, so all clients are
     * playing at the same time in the video.
     * Try setting an interval at 200ms where we seek the correct time
     * in the video.
     */
    setupPlaySync: function() {
      if(this.playSync) {
        clearInterval(this.playSync);
      }
      this.syncCount = 5;
      this.playSync = setInterval(this.syncPlayTime, 200);
    },
    /**
     * Perform the synchronization of the YouTube player, by calculating
     * what time it should be on and seeking towards that time.
     */
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
    /**
     * Load a YouTube video by url.
     * @param inUrl Url to load in the player.
     */
    loadVideo: function(inUrl) {
      console.log("loadVideo:", inUrl);
      this.player.loadVideoByUrl(inUrl, 0)
    },
    /**
     * Play the YouTube player, and seek it to a certain time.
     * @param inTime Time to seek the video to.
     */
    doPlay: function(inTime) {
      console.log("PlayVideo", inTime);
      this.playing = true;
      this.player.playVideo();
      this.player.seekTo(inTime, true);
    },
    /**
     * Pause the YouTube player, and seek it to a certain time.
     * @param inTime Time to seek the video to.
     */
    doPause: function(inTime) {
      console.log("PauseVideo", inTime);
      this.playing = false;
      this.player.pauseVideo();
      this.player.seekTo(inTime, true);
    },
    /**
     * Stop the YouTube player.
     */
    doStop: function() {
      console.log("StopVideo");
      this.playing = false;
      this.player.stopVideo();
    }
  }
}
