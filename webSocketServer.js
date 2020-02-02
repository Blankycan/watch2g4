var WebSocketServer = require('websocket').server;
var http = require('http');
var request = require('request-promise-native')
var JSSoup = require('jssoup').default
var jsdom = require("jsdom");
const { JSDOM } = jsdom;

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

function requestState(user){
  let msg = {
    type: 'syncState',
    receiver: user.uuid
  }
  clients[0].connection.send(JSON.stringify(msg))
}


function sendState(data) {
  const receiver = data.receiver
  data.type = 'stateUpdate'
  for(let i = 0; i < clients.length; ++i) {
    if(clients[i].uuid == receiver) {
      clients[i].connection.send(JSON.stringify(data));
    }
  }
}


function broadcastUserlist() {
  let msg = {
    type: "userlist",
    users: []
  };
  for(let i = 0; i < clients.length; ++i) {
    msg.users.push({
      username: clients[i].username,
      uuid: clients[i].uuid
    });
  }
  broadcast(JSON.stringify(msg));
}

async function getVideoInfo(inMsg) {
  console.log("Queue video")
  let title;
  // Do a request to youtube to get the title
  var options = {
    uri: inMsg.originalUrl
  };
  try{
    const result = await request(options)
    const soup = new JSSoup(result)
    const tags = soup.find('meta', {'name': 'title'})
    if (tags.attrs && tags.attrs.content){
      title = tags.attrs.content
      const parser = new JSDOM("<!doctype html><body>" + title)
      title = parser.window.document.body.textContent
      inMsg['title'] = title
      console.log(title)
    }
  } catch(error) {
    console.log("Failed to get info about video")
    console.log(error)
  }

  if (inMsg.user) {
    for(let i = 0; i < clients.length; ++i) {
      if(clients[i].uuid == inMsg.user) {
        clients[i].connection.send(JSON.stringify(inMsg));
      }
    }  
  } else{
    broadcast(JSON.stringify(inMsg))
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

      // Handle initial connect message, where the client sends his username and get his UUID in return 
      if(data.type === "connect") {
        console.log(`[${uuid}] New connection by ${data.data}`);
        
        user.username = data.username;
        // Update the uuid we use if client supplied one
        if(data.uuid) {
          console.log(`Changed uuid from: ${uuid} to: ${data.uuid}`);
          uuid = data.uuid;
          user.uuid = uuid;
        }
        console.log(`[${uuid}] New connection by '${data.username}'`);

        // Send client its userdata with uuid
        connection.send(JSON.stringify({
          type: "userdata",
          data: {
            uuid: uuid
          }
        }));

        // Broadcast updated userlist
        broadcastUserlist();
        
        if (clients.length > 1) {
          // Ask another client for the current state
          requestState(user)
        }
      }

      // Rename user
      else if(data.type === "rename") {
        if(uuid === data.uuid) {
          user.username = data.username;
          broadcastUserlist();
        }
      }

      else if(data.type === "search" || data.type === "syncQueue" || data.type === "playQueuedVideo") {
        broadcast(message.utf8Data);
      }
      else if(data.type === "queue") {
        getVideoInfo(data);
      }
      else if(data.type === "syncState") {
        sendState(data)
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

        // Broadcast updated userlist
        broadcastUserlist();

        break;
      }
    }
  });
});
