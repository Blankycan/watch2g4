var WebSocketServer = require('websocket').server;
var http = require('http');

var clients = [];

var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
server.listen(3031, function() { });
console.log("Listening to port 3031..");

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function broadcast(inMsg, uuidSkip) {
  for(let i = 0; i < clients.length; ++i) {
    if(clients[i].uuid !== uuidSkip) {
      clients[i].connection.send(inMsg);
    }
  }
}

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  let uuid = uuidv4();
  let user = {
    uuid: uuid,
    connection: connection,
    username: "Unknown"
  };
  clients.push(user);
  console.log(`[${uuid}] Connection from origin ${request.origin}`);

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      // process WebSocket message
      let data = {};
      try {
        data = JSON.parse(message.utf8Data);
      }
      catch(e) {
        console.log("Failed to parse message:", message);
      }

      if(data.type === "connect") {
        console.log(`[${uuid}] New connection by ${data.data}`);
      }
      else if(data.type === "search") {
        broadcast(message.utf8Data);
      }
      else if(data.type === "playback") {
        if(data.action === "play" || data.action === "pause") {
          console.log(`[${uuid}] Started changed the video playback`);
          broadcast(message.utf8Data, uuid);
        }
      }
      else {
        console.log("Unknown messge:", message.utf8Data);
      }
    }
  });

  connection.on('close', function(connection) {
    console.log(`[${uuid}] Closed connection`);
    // close user connection
    for(let i = 0; i < clients.length; ++i) {
      if(clients[i].uuid === uuid) {
        clients.splice(i, 1);
        break;
      }
    }
  });
});