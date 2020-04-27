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

var rooms = {};
var gameState = {
    type: "start"
};
var timer = new Date(Date.now()+30*1000);

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
                guessedCelebrities: [],
                playerOrder: []
            };
            rooms[roomCode] = room;
            console.log(room);
            gameState.type = "inLobby";
            socket.emit('serverEvent', { roomCode: roomCode, type: "roomCreated" });
        }
        //2
        else if (gameState.type === "inLobby" && data.event === "joinRoom") {
            console.log(data);
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            if (data.playerName in rooms[data.roomCode].players) {
                socket.emit('serverEvent', { error: "Player Name exists already! slut", type: "error2" });
                return;
            }
            playerName = data.playerName;
            roomCode = data.roomCode;
            let player = { playerName: data.playerName, cookie: data.cookie, socket: socket }
            rooms[data.roomCode].players[data.playerName] = player;
            console.log(rooms[data.roomCode]);
            socket.emit('serverEvent', { players: Object.keys(rooms[data.roomCode].players), type: "roomJoined" });
        }
        //3 & 4
        /*else if (gameState.type === "start" && data.event === "lobbyPhase") {
            gameState.type = "in-lobby";
        }*/
        //5
        else if (gameState.type === "inLobby" && data.event === "celebNames") {
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            rooms[data.roomCode].celebrities.push({ playerName: playerName, celebName: data.firstCelebName });
            rooms[data.roomCode].celebrities.push({ playerName: playerName, celebName: data.secondCelebName });
            console.log(rooms[data.roomCode]);
        }
        //6 & 7
        else if (gameState.type === "inLobby" && data.event === "startGame") {
            let room = rooms[data.roomCode];
            if (playerName !== room.vip) {
            //if (socket === room.players[room.vip].socket) {
                console.log("Cant Start");
                return;
            }
            gameState.type = "inGame";
            room.playerOrder = shuffle(Object.keys(room.players));
            console.log("playerOrder ", room.playerOrder);
            let currentDescriber = room.playerOrder[room.currentPlayerIndex];
            console.log("currentDescriber ", currentDescriber);
            io.emit('serverEvent', { type: "gameStarted" });
            room.players[currentDescriber].socket.emit('serverEvent', { type: "yourRound"});
        }
        //8
        else if (gameState.type === "inGame" && data.event === "startRound") {
            let room = rooms[data.roomCode];
            room.celebrities = shuffle(room.celebrities);
            let currentDescriber = room.playerOrder[room.currentPlayerIndex];
            room.currentCeleb = room.celebrities.pop();
            //io.emit('serverEvent', { type: "roundStarted"});
            //room.currentDescriber = currentDescriber; Don't need?
            room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.currentCeleb.celebName, type: "nextCeleb"});
            setTimeout(function () {
                room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.currentCeleb.celebName, type: "endRound"});
                room.currentPlayerIndex += 1;
                currentDescriber = room.playerOrder[room.currentPlayerIndex];
                room.players[currentDescriber].socket.emit('serverEvent', { type: "yourRound"});
            }, 10000);
        }
        //9
        else if (gameState.type === "inGame" && data.event === "requestCeleb") {
            let room = rooms[roomCode];
            io.emit('serverEvent', { celeb: room.currentCeleb.celebName, type: "celebGuessed" });
            room.guessedCelebrities.push(room.currentCeleb);
            room.currentCeleb = room.celebrities.pop();
            let currentDescriber = room.playerOrder[room.currentPlayerIndex];
            room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.currentCeleb.celebName, type: "nextCeleb" });
            console.log("Next ", room);
        }
        //10
        else if (gameState.type === "inGame" && data.event === "passCeleb") {
            let room = rooms[roomCode];
            io.emit('serverEvent', { celeb: room.currentCeleb, type: "celebPassed" });
            let passCeleb = room.currentCeleb;
            room.currentCeleb = room.celebrities.pop();
            room.celebrities.unshift(passCeleb);
            room.celebrities = shuffle(room.celebrities);
            let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
            room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.currentCeleb.celebName, type: "nextCeleb" });
            console.log("Passed ", room);
        }

        /*else if (gameState.type === "in-game" && data.event === "endRound") {

        }*/

        else {
            console.log("Server: Game State ", gameState, ", Unhandled event ", data.event, " Error");
        };
    });
});

http.listen(8888, function () {
    console.log('listening on 8888');
});