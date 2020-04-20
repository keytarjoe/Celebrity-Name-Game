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
    let roomCode;

    socket.on('createRoom', function (data) {
        console.log(data);
        roomCode = generateCode();
        let players = {};
        playerName = data.playerName;
        players[data.playerName] = { playerName: data.playerName, cookie: data.cookie, socket: socket };
        let room = {
            roomCode: roomCode,
            currentPlayerIndex: 0,
            vip: data.playerName,
            players: players,
            celebrities: [],
            guessedCelebrities: []
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
        roomCode = data.roomCode;
        let player = { playerName: data.playerName, cookie: data.cookie, socket: socket }
        rooms[data.roomCode].players[data.playerName] = player;
        console.log(rooms[data.roomCode]);
        socket.emit('roomJoined', { players: Object.keys(rooms[data.roomCode].players) });
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
        let room = rooms[data.roomCode];
        if (playerName !== room.vip) {
        //if (socket === room.players[room.vip].socket) {}
            console.log("Cant Start");
            return;
        }
        io.emit('gameStarted', "Game Started!");
        
        room.celebrities = shuffle(room.celebrities);
        let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
        room.currentCeleb = room.celebrities.pop();
        //room.currentDescriber = currentDescriber;
        room.players[currentDescriber].socket.emit('takeTurn', { celeb: room.currentCeleb.celebName });
    });

    socket.on('requestCeleb', function() {
        let room = rooms[roomCode];
        io.emit('celebGuessed', {celeb: room.currentCeleb.celebName});
        room.guessedCelebrities.push(room.currentCeleb);
        room.currentCeleb = room.celebrities.pop();
        let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
        room.players[currentDescriber].socket.emit('nextCeleb', { celeb: room.currentCeleb.celebName });
        console.log("Next ", room);
    });

    socket.on('passCeleb', function(data) {
        let room = rooms[roomCode];
        io.emit('celebPassed', {celeb: room.currentCeleb});
        let passCeleb = room.currentCeleb;
        room.currentCeleb = room.celebrities.pop();
        room.celebrities.unshift(passCeleb);
        room.celebrities = shuffle(room.celebrities);
        let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
        room.players[currentDescriber].socket.emit('nextCeleb', { celeb: room.currentCeleb.celebName });
        console.log("Passed ", room);
    });
});



http.listen(8888, function () {
    console.log('listening on 8888');
});