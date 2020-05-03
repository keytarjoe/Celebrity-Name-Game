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
    res.sendFile('index.html', { "root": "./client/html" });
});
app.get('/terms', function (req, res) {
    res.sendFile('terms.html', { "root": "./client/html" });
});

var rooms = {};
var gameState = {
    type: "start"
};
var timer = new Date(Date.now() + 30 * 1000);

//Functions

function emitRoom(room, message) {
    /*for (let player in room.players) {
        console.log(player);
        io.to(player.socketId).emit('serverEvent', message);
    }*/
    Object.values(room.players).forEach(function (player) {
        console.log(player);
        io.to(player.socketId).emit('serverEvent', message);
    })
}

function emitTeam1(room, message) {
    for (let playerName in room.team1) {
        room.players[playerName].socketId.emit('serverEvent', message);
    }
}

function emitTeam2(room, message) {
    for (let playerName in room.team2) {
        room.players[playerName].socket.emit('serverEvent', message);
    }
}

function emitPlayer(player, message) {
    io.to(player.socketId).emit('serverEvent', message);
}

function generateCode() {
    var result = '';
    var char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charLength = char.length;
    for (i = 0; i < 5; i++) {
        result += char.charAt(Math.floor(Math.random() * charLength));
    }
    return result;
}

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
}

//Event Listener
io.on('connection', function (socket) {
    console.log('A user connected');

    let playerName;
    let roomCode;
    let room;
    /*let playerState = {
        playerName: null,
        roomCode: null,
        socket: socket
    }*/

    socket.on('clientEvent', function (data) {
        handleEvent(data);
    });

    function handleEvent(data) {
        //1
        if (gameState.type === "start" && data.event === "createRoom") {
            console.log(data);
            roomCode = generateCode();
            //roomCode = data.roomCode;
            playerName = data.playerName;
            let players = {};
            players[data.playerName] = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id };
            room = {
                roomCode: roomCode,
                currentPlayerIndex: 0,
                vip: data.playerName,
                players: players,
                celebrities: [],
                guessedCelebrities: [],
                playerOrder: [],
                team1: [],
                team2: []
            };
            rooms[roomCode] = room;
            console.log(room);
            gameState.type = "inLobby";
            //socket.emit('serverEvent', { roomCode: roomCode, type: "roomCreated" });
            emitPlayer(players[data.playerName], { roomCode: roomCode, type: "roomCreated" });
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
            room = rooms[roomCode];
            let player = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id }
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
            for (var i = 0, l = room.playerOrder.length; i < l; i += 2) {
                room.team1[i / 2] = room.playerOrder[i];
                room.team2[i / 2] = room.playerOrder[i + 1];
            }
            if (room.playerOrder.length % 2) {
                room.team2.pop();
            }
            console.log("playerOrder ", room.playerOrder);
            console.log("Team 1 ", room.team1, " and Team 2 ", room.team2);
            console.log(room.players);
            let currentDescriber = room.playerOrder[room.currentPlayerIndex];
            //io.emit('serverEvent', { type: "gameStarted" });
            console.log("StartGame ", room);
            emitRoom(room, { type: "gameStarted" });
            //room.players[currentDescriber].socket.emit('serverEvent', { type: "yourRound"});
            emitPlayer(room.players[currentDescriber], { type: "yourRound" });
        }
        //8
        else if (gameState.type === "inGame" && data.event === "startRound") {
            //let room = rooms[roomCode];
            let currentDescriber = room.playerOrder[room.currentPlayerIndex];
            room.celebrities = shuffle(room.celebrities);
            //io.emit('serverEvent', { type: "roundStarted"});
            //room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.celebrities[0].celebName, type: "nextCeleb"});
            emitPlayer(room.players[currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
            setTimeout(function () {
                //room.players[currentDescriber].socket.emit('serverEvent', { type: "endRound"});
                emitPlayer(room.players[currentDescriber], { type: "endRound" });
                room.currentPlayerIndex += 1;
                if (room.currentPlayerIndex === room.playerOrder.length) {
                    room.currentPlayerIndex = 0;
                }
                console.log("PLayer Index is now " + room.currentPlayerIndex);
                currentDescriber = room.playerOrder[room.currentPlayerIndex];
                //room.players[currentDescriber].socket.emit('serverEvent', { type: "yourRound"});
                emitPlayer(room.players[currentDescriber], { type: "yourRound" });
            }, 10000);
        }
        //9
        else if (gameState.type === "inGame" && data.event === "requestCeleb") {
            //let room = rooms[roomCode];
            //io.emit('serverEvent', { celeb: room.celebrities[0].celebName, type: "celebGuessed" });
            emitRoom(room, { type: "celebGuessed", celeb: room.celebrities[0].celebName });
            room.guessedCelebrities.push(room.celebrities.shift());
            if (room.celebrities.length === 0) {
                gameState.type = "end";
                //io.emit('serverEvent', { type: "gameEnded" });
                emitRoom(room, { type: "gameEnded" })
            } else {
                let currentDescriber = room.playerOrder[room.currentPlayerIndex];
                //room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.celebrities[0].celebName, type: "nextCeleb" });
                emitPlayer(room.players[currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
                console.log("Next ", room);
            }
        }
        //10
        else if (gameState.type === "inGame" && data.event === "passCeleb") {
            //let room = rooms[roomCode];
            //io.emit('serverEvent', { type: "celebPassed" });
            emitRoom(room, { type: "celebPassed" });
            let currentDescriber = Object.keys(room.players)[room.currentPlayerIndex];
            if (room.celebrities.length === 0) {
                //room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.celebrities[0].celebName, type: "nextCeleb" });
                emitPlayer(room.players[currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
            } else {
                let passCeleb = room.celebrities.shift();
                //room.players[currentDescriber].socket.emit('serverEvent', { celeb: room.celebrities[0].celebName, type: "nextCeleb" });
                emitPlayer(room.players[currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
                room.celebrities.push(passCeleb);
            }
        }

        /*else if (gameState.type === "in-game" && data.event === "endRound") {

        }*/
        else {
            console.log("Server: Game State ", gameState, ", Unhandled event ", data.event, " Error");
        }
    }
});

http.listen(8888, function () {
    console.log('listening on 8888');
});