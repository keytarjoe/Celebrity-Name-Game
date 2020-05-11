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

//Event Listener
io.on('connection', function (socket) {
    console.log('A user connected');

    let playerName;
    let roomCode;
    let roundTimer;
    var lobbyInterval;
    let room;
    
    socket.on('clientEvent', function (data) {
        handleEvent(data);
    });

    function handleEvent(data) {
        
        //1
        if (gameState.type === "start" && data.event === "createRoom") {
            roomCode = generateCode();
            playerName = data.playerName;
            let roundDuration = data.roundDuration;
            let milliseconds = 1000;
            let players = {};
            players[data.playerName] = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id, suggestionsSubmitted: false };
            let roomObject = {
                roomCode: roomCode,
                currentPlayerIndex: 0,
                vip: data.playerName,
                numberOfSuggestions: data.numberOfSuggestions,
                roundDuration: roundDuration * milliseconds,
                players: players,
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
            rooms[roomCode] = roomObject;
            console.log("createRoom Event - rooms ", rooms[roomCode]);
            room = rooms[roomCode];
            gameState.type = "inLobby";
            emitPlayer(players[data.playerName], {
                type: "roomCreated",
                roomCode: roomCode,
                numberOfSuggestions: room.numberOfSuggestions,
                roundDuration: room.roundDuration
            });
            lobbyInterval = setInterval(function() {
                //emitRoom(room, { type: 'refreshPlayers', players: Object.keys(room.players) });
                refreshPlayers(room);
            }, 1000);
        }
        //2
        else if (gameState.type === "inLobby" && data.event === "joinRoom") {
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            if (data.playerName in rooms[data.roomCode].players) {
                socket.emit('serverEvent', { error: "Player Name exists already! slut", type: "error2" });
                return;
            }
            room = rooms[data.roomCode];
            playerName = data.playerName;
            let player = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id, suggestionsSubmitted: false };
            room.players[data.playerName] = player;
            //socket.emit('serverEvent', { players: Object.keys(rooms[data.roomCode].players), type: "roomJoined" });
            emitPlayer(room.players[data.playerName], {
                type: "roomJoined",
                numberOfSuggestions: room.numberOfSuggestions,
                roundDuration: room.roundDuration
            });
        }
        //5
        else if (gameState.type === "inLobby" && data.event === "celebNames") {
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            for ( i = 0; i < data.celebs.length; i++) {
                rooms[data.roomCode].celebrities.push({ playerName: playerName, celebName: data.celebs[i] });
            }
            rooms[data.roomCode].players[playerName].suggestionsSubmitted = true;
        }
        //6 & 7
        else if (gameState.type === "inLobby" && data.event === "startGame") {
            //let room = rooms[data.roomCode];
            clearInterval(lobbyInterval);
            if (playerName !== room.vip) {
                console.log("Cant Start");
                return;
            }
            gameState.type = "inGame";
            room.playerOrder = shuffle(Object.keys(room.players));
            for (var i = 0, l = room.playerOrder.length; i < l; i += 2) {
                room.team1.members[i / 2] = room.playerOrder[i];
                room.team2.members[i / 2] = room.playerOrder[i + 1];
            }
            if (room.playerOrder.length % 2) {
                room.team2.members.pop();
            }
            room.currentDescriber = room.playerOrder[room.currentPlayerIndex];
            emitRoom(room, { type: "gameStarted", team1: room.team1.members, team2: room.team2.members });
            emitPlayer(room.players[room.currentDescriber], { type: "yourRound" });
            emitRoom(room, { type: "currentDescriber", currentDescriber: room.currentDescriber });
        }
        //8
        else if (gameState.type === "inGame" && data.event === "startRound") {
            room.celebrities = shuffle(room.celebrities);
            emitRoom(room, { type: "roundStarted" });
            emitPlayer(room.players[room.currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
            roundTimer = setTimeout(function () {
                emitPlayer(room.players[room.currentDescriber], { type: "endRound" });
                //emitRoom(room, { type: "roundEnded", team1Score: room.team1.score, team2Score: room.team2.score });
                room.currentPlayerIndex += 1;
                if (room.currentPlayerIndex === room.playerOrder.length) {
                    room.currentPlayerIndex = 0;
                }
                room.currentDescriber = room.playerOrder[room.currentPlayerIndex];
                emitRoom(room, { type: "currentDescriber", currentDescriber: room.currentDescriber });
                emitPlayer(room.players[room.currentDescriber], { type: "yourRound" });
            }, room.roundDuration);
        }
        //9
        else if (gameState.type === "inGame" && data.event === "requestCeleb") {
            score(room);
            emitRoom(room, { type: "celebGuessed", celeb: room.celebrities[0].celebName });
            room.guessedCelebrities.push(room.celebrities.shift());
            room.currentDescriber = room.playerOrder[room.currentPlayerIndex];
            if (room.celebrities.length === 0) {
                clearInterval(roundTimer);
                gameState.type = "end";
                emitRoom(room, { type: "gameEnded", celebrities: room.guessedCelebrities });
            } else {
                emitPlayer(room.players[room.currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
            }
        }
        //10
        else if (gameState.type === "inGame" && data.event === "passCeleb") {
            emitRoom(room, { type: "celebPassed" });
            if (room.celebrities.length === 0) {
                emitPlayer(room.players[room.currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
            } else {
                let passCeleb = room.celebrities.shift();
                emitPlayer(room.players[room.currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
                room.celebrities.push(passCeleb);
            }
        }
    
        /*else if (gameState.type === "end" && data.event === "endGame") {
            gameState.type === "end";
            emitRoom(room, { type: "gameEnded" });
        }*/
    
        else {
            console.log("Server: Game State ", gameState, ", Unhandled event ", data.event, " Error");
        }
    }

});

http.listen(8888, function () {
    console.log('listening on 8888');
});
//var gameState = {type: "start"};

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
        emitRoom(room, { type: "scoreUpdate", team: "team1", team1Score: room.team1.score });
    } else if (room.team2.members.includes(room.currentDescriber)) {
        room.team2.score += 1;
        emitRoom(room, { type: "scoreUpdate", team: "team2", team2Score: room.team2.score });
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