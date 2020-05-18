//Websocket Server with Socket.io
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, { cookie: false });
const session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true,
});
const sharedsession = require("express-socket.io-session");

// Attach session
app.use(session);

// Share session with io sockets
io.use(sharedsession(session));

app.use(express.static(__dirname + '/client'));

app.get('/', function (req, res) {
    res.sendFile('index.html', { "root": "./client/html" });
});
app.get('/terms', function (req, res) {
    res.sendFile('terms.html', { "root": "./client/html" });
});

var rooms = {};
var sessions = {};

//Event Listener
io.on('connection', function (socket) {
    console.log('A user connected', socket.handshake.session.id);

    if (!sessions[socket.handshake.session.id]) {
        sessions[socket.handshake.session.id] = {
            playerName: null,
            roomCode: null,
            room: null,
            team: null,
            playerState: "inApp"
        };
    }

    let player = sessions[socket.handshake.session.id];

    if (player.playerState === "inRoom") {
        console.log("Session reconnect");
        handleEvent({ event: "reconnect" });
    }

    let roundTimer;
    let lobbyInterval;
    
    socket.on('clientEvent', function (data) {
        handleEvent(data);
    });

    socket.on('disconnect', function () {
        console.log('A user disconnected', socket.handshake.session.id);
    });

    function handleEvent(data) {
        console.log("Handle Event log ", data, player);
        //1
        if (data.event === "createRoom") {
            player.playerState = "inRoom";
            player.roomCode = generateCode();
            player.playerName = data.playerName;
            let roundDuration = data.roundDuration;
            let milliseconds = 1000;
            let playerObject = {};
            playerObject[data.playerName] = {
                playerName: data.playerName,
                socketId: socket.id,
                suggestionsSubmitted: false
            };
            let roomObject = {
                gameState: "inLobby",
                roomCode: player.roomCode,
                currentPlayerIndex: 0,
                vip: data.playerName,
                numberOfSuggestions: data.numberOfSuggestions,
                roundDuration: roundDuration * milliseconds,
                players: playerObject,
                celebrities: [],
                guessedCelebrities: [],
                playerOrder: [],
                team1: {
                    score: 0,
                    members: []
                },
                team2: {
                    score: 0,
                    members: []
                }
            };
            rooms[player.roomCode] = roomObject;
            player.room = rooms[player.roomCode];
            emitPlayer(playerObject[data.playerName], {
                type: "roomCreated",
                roomCode: player.roomCode,
                numberOfSuggestions: player.room.numberOfSuggestions,
                roundDuration: player.room.roundDuration
            });
            lobbyInterval = setInterval(function() {
                refreshPlayers(player.room);
            }, 1000);
        }
        //2
        else if (data.event === "joinRoom") {
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            if (data.playerName in rooms[data.roomCode].players) {
                socket.emit('serverEvent', { error: "Player Name exists already! slut", type: "error2" });
                return;
            }
            player.playerState = "inRoom";
            player.room = rooms[data.roomCode];
            player.playerName = data.playerName;
            player.roomCode = data.roomCode;
            let playerObject = {
                playerName: data.playerName,
                socketId: socket.id,
                suggestionsSubmitted: false
            };
            player.room.players[data.playerName] = playerObject;
            emitPlayer(player.room.players[data.playerName], {
                type: "roomJoined",
                numberOfSuggestions: player.room.numberOfSuggestions,
                roundDuration: player.room.roundDuration
            });
            console.log("Join Room log ", player);
        }
        //5
        else if (player.room.gameState === "inLobby" && data.event === "celebNames") {
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            for ( i = 0; i < data.celebs.length; i++) {
                rooms[data.roomCode].celebrities.push({
                    playerName: player.playerName,
                    celebName: data.celebs[i]
                });
            }
            rooms[data.roomCode].players[player.playerName].suggestionsSubmitted = true;
        }
        //6 & 7
        else if (player.room.gameState === "inLobby" && data.event === "startGame") {
            clearInterval(lobbyInterval);
            if (player.playerName !== player.room.vip) {
                console.log("Cant Start", player.playerName);
                return;
            }
            player.room.gameState = "inGame";
            player.room.playerOrder = shuffle(Object.keys(player.room.players));
            for (var i = 0, l = player.room.playerOrder.length; i < l; i += 2) {
                player.room.team1.members[i / 2] = player.room.playerOrder[i];
                player.room.team2.members[i / 2] = player.room.playerOrder[i + 1];
            }
            if (player.room.playerOrder.length % 2) {
                player.room.team2.members.pop();
            }
            if (player.room.team1.members.includes(player.playerName)) {
                player.team = 1;
            } else if (player.room.team2.members.includes(player.playerName)) {
                player.team = 2;
            }
            player.room.currentDescriber = player.room.playerOrder[player.room.currentPlayerIndex];
            emitRoom(player.room, {
                type: "gameStarted",
                team1: player.room.team1.members,
                team2: player.room.team2.members
            });
            emitPlayer(player.room.players[player.room.currentDescriber], { type: "yourRound" });
            emitRoom(player.room, {
                type: "currentDescriber",
                currentDescriber: player.room.currentDescriber
            });
            console.log("Room log ", rooms[player.roomCode]);
        }
        //8
        else if (player.room.gameState === "inGame" && data.event === "startRound") {
            player.room.celebrities = shuffle(player.room.celebrities);
            emitRoom(player.room, { type: "roundStarted" });
            emitPlayer(player.room.players[player.room.currentDescriber], { type: "nextCeleb", celeb: player.room.celebrities[0].celebName });
            roundTimer = setTimeout(function () {
                emitPlayer(player.room.players[player.room.currentDescriber], { type: "endRound" });
                player.room.currentPlayerIndex += 1;
                if (player.room.currentPlayerIndex === player.room.playerOrder.length) {
                    player.room.currentPlayerIndex = 0;
                }
                player.room.currentDescriber = player.room.playerOrder[player.room.currentPlayerIndex];
                emitRoom(player.room, { type: "currentDescriber", currentDescriber: player.room.currentDescriber });
                emitPlayer(player.room.players[player.room.currentDescriber], { type: "yourRound" });
            }, player.room.roundDuration);
        }
        //9
        else if (player.room.gameState === "inGame" && data.event === "requestCeleb") {
            score(player.room);
            emitRoom(player.room, { type: "celebGuessed", celeb: player.room.celebrities[0].celebName });
            player.room.guessedCelebrities.push(player.room.celebrities.shift());
            player.room.currentDescriber = player.room.playerOrder[player.room.currentPlayerIndex];
            if (player.room.celebrities.length === 0) {
                clearInterval(player.roundTimer);
                player.room.gameState = "end";
                emitRoom(player.room, { type: "gameEnded", celebrities: player.room.guessedCelebrities });
            } else {
                emitPlayer(player.room.players[player.room.currentDescriber], { type: "nextCeleb", celeb: player.room.celebrities[0].celebName });
            }
        }
        //10
        else if (player.room.gameState === "inGame" && data.event === "passCeleb") {
            emitRoom(player.room, { type: "celebPassed" });
            if (player.room.celebrities.length === 0) {
                emitPlayer(player.room.players[player.room.currentDescriber], { type: "nextCeleb", celeb: player.room.celebrities[0].celebName });
            } else {
                let passCeleb = player.room.celebrities.shift();
                emitPlayer(player.room.players[player.room.currentDescriber], { type: "nextCeleb", celeb: player.room.celebrities[0].celebName });
                player.room.celebrities.push(passCeleb);
            }
        }

        else if (data.event === "reconnect") {
            player.room.players[player.playerName].socketId = socket.id;
            emitPlayer(player.room.players[player.playerName], {
                type: "reconnect",
                reconnectData: {
                    type: player.room.gameState,
                    numberOfSuggestions: player.room.numberOfSuggestions,
                    roundDuration: player.room.roundDuration,
                    playerName: player.playerName,
                    roomCode: player.roomCode,
                    myTeam: player.team,
                    currentDescriber: player.room.currentDescriber,
                    team1: player.room.team1.members,
                    team2: player.room.team2.members,
                    vip: player.room.vip
                }
            });
        }
    
        else {
            console.log("Server: Game State ", gameState, ", Unhandled event ", data.event, " Error");
        }
    }
});

server.listen(8888, function () {
    console.log('listening on 8888');
});

//Functions

function emitRoom(room, message) {
    Object.values(room.players).forEach(function (player) {
        io.to(player.socketId).emit('serverEvent', message);
    })
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

function score(room) {
    if (room.team1.members.includes(room.currentDescriber)) {
        room.team1.score += 1;
        emitRoom(room, { type: "scoreUpdate", team: "team1", teamScore: room.team1.score });
    } else if (room.team2.members.includes(room.currentDescriber)) {
        room.team2.score += 1;
        emitRoom(room, { type: "scoreUpdate", team: "team2", teamScore: room.team2.score });
    }
};

function refreshPlayers(room) {
    let playerArray = Object.keys(room.players);
    let refreshArray = [];
    for ( i = 0; i < playerArray.length; i++) {
        refreshArray[i] = { playerName: room.players[playerArray[i]].playerName, submitted: room.players[playerArray[i]].suggestionsSubmitted }
    }
    emitRoom(room, { type: 'refreshPlayers', refreshList: refreshArray });
}