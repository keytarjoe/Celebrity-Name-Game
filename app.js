//Websocket Server with Socket.io
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname + '/client'));

app.get('/', function (req, res) {
    res.sendFile('index.html', {"root": "./client/html"});
});
app.get('/terms', function (req, res) {
    res.sendFile('terms.html', {"root": "./client/html"});
});

/*

Rooms
{
    roomCode: roomCode,
    vip: "",
    players: [],
    celebrities: []
}
players
{
    cookie: ,
    playerName: 
}
*/

function generateCode() {
    var result = '';
    var char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charLength = char.length;
    for (i = 0; i < 5; i++) {
        result += char.charAt(Math.floor(Math.random() * charLength));
    }
    return result;
};

function shuffle(array) {
    var m = array.length, t, i;
    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);
        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
};

var rooms = {};
io.on('connection', function (socket) {
    console.log('A user connected');
    /*socket.on('setUsername', function(data) {
        console.log(data);
       
        if(users.indexOf(data) > -1) {
            socket.emit('userExists', data + ' username is taken! Try some other username.')
        } else {
            users.push(data);
            socket.emit('userSet', {username: data});
        }
   });*/
    let playerName;

    socket.on('createRoom', function (data) {
        console.log(data);
        let roomCode = generateCode(),
            players = {};
        playerName = data.playerName;
        players[data.playerName] = { playerName: data.playerName, cookie: data.cookie, socket: socket };
        let room = {
            roomCode: roomCode,
            currentPlayerIndex: 0,
            vip: data.cookie,
            players: players,
            celebrities: []
        };
        rooms[roomCode] = room;
        console.log(room);
        socket.emit('roomCreated', { roomCode: roomCode });
    });

    socket.on('joinRoom', function (data) {
        console.log(data);
        if (!(data.roomCode in rooms)) {
            socket.emit('error2', { error: "Room does not exist! bitch" });
            return;
        }
        if (data.playerName in rooms[data.roomCode].players) {
            socket.emit('error2', { error: "Player Name exists already! slut" });
            return;
        }
        playerName = data.playerName;
        let player = { playerName: data.playerName, cookie: data.cookie, socket: socket }
        rooms[data.roomCode].players[data.playerName] = player;
        console.log(rooms[data.roomCode]);
        io.emit('joinedPlayers', { players: Object.keys(rooms[data.roomCode].players) });
    });

    socket.on('celebNames', function (data) {
        console.log(data);
        if (!(data.roomCode in rooms)) {
            socket.emit('error2', { error: "Room does not exist! bitch" });
            return;
        }
        rooms[data.roomCode].celebrities.push({ playerName: playerName, celebName: data.firstCelebName });
        rooms[data.roomCode].celebrities.push({ PlayerName: playerName, celebName: data.secondCelebName });
        console.log(rooms[data.roomCode]);
    });

    socket.on('startGame', function(data) {
        io.emit('gameStarted', "Game Started!");
        let room = rooms[data.roomCode],
            playerName = Object.keys(room.players)[room.currentPlayerIndex];
        room.players[playerName].socket.emit('msg', { celeb: room.celebrities[0] });
    });
});



http.listen(8888, function () {
    console.log('listening on 8888');
});