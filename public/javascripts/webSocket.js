let webSocketServer = "wws://<insert.address.of.websocket.server>":

var webSocket = {
  data: function() {
    return {
      socket: null
    }
  },
  created() {
    // Setup the WebSocket towards our video server
    this.socket = new WebSocket(webSocketServer);

    this.socket.addEventListener('open', (event) => {
      let msg = {
        type: "connect",
        username: this.username,
        uuid: this.uuid
      };
      app.socket.send(JSON.stringify(msg));
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
      this.socket.send(inMessage);
    }
  }
}
