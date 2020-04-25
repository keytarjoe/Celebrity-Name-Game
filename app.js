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

//Functions
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

//Event Listener
var rooms = {};
var gameState = {
    type: "start"
};

io.on('connection', function (socket) {
    console.log('A user connected');

    let playerName;
    let roomCode;

    socket.on('clientEvent', function(data) {
        //1
        if (gameState.type === "start" && data.event === "createRoom") {
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
            gameState.type = "in-lobby";
            socket.emit('roomCreated', { roomCode: roomCode });
        }
        //2
        else if (gameState.type === "in-lobby" && data.event === "joinRoom") {
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
        }
        //3 & 4
        /*else if (gameState.type === "start" && data.event === "lobbyPhase") {
            gameState.type = "in-lobby";
        }*/
        //5
        else if (gameState.type === "in-lobby" && data.event === "celebNames") {
            if (!(data.roomCode in rooms)) {
                socket.emit('error2', { error: "Room does not exist! bitch" });
                return;
            }
            rooms[data.roomCode].celebrities.push({ playerName: playerName, celebName: data.firstCelebName });
            rooms[data.roomCode].celebrities.push({ playerName: playerName, celebName: data.secondCelebName });
            console.log(rooms[data.roomCode]);
        }
        //6 & 7
        else if (gameState.type === "in-lobby" && data.event === "startGame") {
            let room = rooms[data.roomCode];
            if (playerName !== room.vip) {
            //if (socket === room.players[room.vip].socket) {}
                console.log("Cant Start");
                return;
            }
            gameState.type = "in-game";
            io.emit('gameStarted', "Game Started!");
            room.celebrities = shuffle(room.celebrities);
            let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
            room.currentCeleb = room.celebrities.pop();
            //room.currentDescriber = currentDescriber;
            room.players[currentDescriber].socket.emit('takeTurn', { celeb: room.currentCeleb.celebName });
        }
        //8
        else if (gameState.type === "in-game" && data.event === "requestCeleb") {
            let room = rooms[roomCode];
            io.emit('celebGuessed', {celeb: room.currentCeleb.celebName});
            room.guessedCelebrities.push(room.currentCeleb);
            room.currentCeleb = room.celebrities.pop();
            let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
            room.players[currentDescriber].socket.emit('nextCeleb', { celeb: room.currentCeleb.celebName });
            console.log("Next ", room);
        }
        //9
        else if (gameState.type === "in-game" && data.event === "passCeleb") {
            let room = rooms[roomCode];
            io.emit('celebPassed', {celeb: room.currentCeleb});
            let passCeleb = room.currentCeleb;
            room.currentCeleb = room.celebrities.pop();
            room.celebrities.unshift(passCeleb);
            room.celebrities = shuffle(room.celebrities);
            let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
            room.players[currentDescriber].socket.emit('nextCeleb', { celeb: room.currentCeleb.celebName });
            console.log("Passed ", room);
        }

        else {
            console.log("Game State ", gameState, ", Unhandled event ", data.event, " Error");
        };
    });
});

http.listen(8888, function () {
    console.log('listening on 8888');
});