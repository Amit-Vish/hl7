console.log('check this one');

var hl7    = require('simple-hl7');
var server = hl7.Server;

var tcpServer  = server.createTcpServer();

tcpServer.on('msg', function(msg) {
	console.log(')))))))))))))))))))))))))))))(((((((((((((((((((((((((((');
  //msg is a Message object from "simple-hl7". see simple-hl7 on npm/github for API

  //do something with message

  //ACKs handled automatically, so don't worry about them.
  //API for custom ACKS coming in the future
});

tcpServer.start(8080) //port number

var tcpClient = server.createTcpClient();
tcpClient.connect('127.0.0.1', 8080);
tcpClient.send(msg);