let webSocketServer = "wws://<insert.address.of.websocket.server>":

var webSocket = {
  data: function() {
    return {
      socket: null,
      messageQueue: []
    }
  },
  created() {
    // Setup the WebSocket towards our video server
    this.socket = new WebSocket(webSocketServer);

    // When the socket has opened
    this.socket.addEventListener('open', (event) => {
      let msg = {
        type: "connect",
        username: this.username,
        uuid: this.uuid
      };
      this.send(JSON.stringify(msg));

      // Send any packets that got put into the messageQueue
      for(let i = 0; i < this.messageQueue.length; ++i) {
        this.send(this.messageQueue[i]);
      }
      this.messageQueue = [];
    });

    // Setup callback to handle all messages from the Web Socket
    this.socket.addEventListener('message', this.onMessage);
  },
  methods: {
    /**
     * Send a message to the WebSocket.
     * @param inMessage Stringified JSON data.
     */
    send: function(inMessage) {
      // Make sure it's a string
      if(typeof inMessage !== "string") {
        inMessage = JSON.stringify(inMessage);
      }

      if(this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(inMessage);
      }
      // If socket isn't open yet, queue it
      else if(this.socket.readyState === WebSocket.CONNECTING) {
        this.messageQueue.push(inMessage);
      }
    }
  }
}
