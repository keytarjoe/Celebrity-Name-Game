//Websocket Server with Socket.io
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
  });
var sharedsession = require("express-socket.io-session");

// Attach session
app.use(session);

// Share session with io sockets
io.use(sharedsession(session));

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

var sessions = {};

//Event Listener
io.on('connection', function (socket) {
    console.log('A user connected', socket.handshake.session.id);

    if (!sessions[socket.handshake.session.id]) {
        sessions[socket.handshake.session.id] = {
            playerName: null,
            roomCode: null,
            roundTimer: null,
            lobbyInterval: null,
            room: null,
        };
    }

    var session = sessions[socket.handshake.session.id];

    console.log(session);
    
    socket.on('clientEvent', function (data) {
        handleEvent(data);
    });

    socket.on('disconnect', function () {
        console.log('A user disconnected', socket.handshake.session.id);
    });

    /*socket.on('reconnect', function (data) {
        socket.join()
    })*/

    function handleEvent(data) {
        
        //1
        if (gameState.type === "start" && data.event === "createRoom") {
            session.roomCode = generateCode();
            session.playerName = data.playerName;
            let roundDuration = data.roundDuration;
            let milliseconds = 1000;
            let players = {};
            players[data.playerName] = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id, suggestionsSubmitted: false };
            let roomObject = {
                //gameState: "inLobby",
                roomCode: session.roomCode,
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
            rooms[session.roomCode] = roomObject;
            console.log("createRoom Event - rooms ", rooms[session.roomCode]);
            //socket.join(session.roomCode);
            session.room = rooms[session.roomCode];
            gameState.type = "inLobby";
            emitPlayer(players[data.playerName], {
                type: "roomCreated",
                roomCode: session.roomCode,
                numberOfSuggestions: session.room.numberOfSuggestions,
                roundDuration: session.room.roundDuration
            });
            session.lobbyInterval = setInterval(function() {
                //emitRoom(session.room, { type: 'refreshPlayers', players: Object.keys(session.room.players) });
                refreshPlayers(session.room);
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
            //socket.join(data.roomCode);
            session.room = rooms[data.roomCode];
            session.playerName = data.playerName;
            let player = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id, suggestionsSubmitted: false };
            session.room.players[data.playerName] = player;
            //socket.emit('serverEvent', { players: Object.keys(rooms[data.roomCode].players), type: "roomJoined" });
            emitPlayer(session.room.players[data.playerName], {
                type: "roomJoined",
                numberOfSuggestions: session.room.numberOfSuggestions,
                roundDuration: session.room.roundDuration
            });
        }
        //5
        else if (gameState.type === "inLobby" && data.event === "celebNames") {
            if (!(data.roomCode in rooms)) {
                socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
                return;
            }
            for ( i = 0; i < data.celebs.length; i++) {
                rooms[data.roomCode].celebrities.push({ playerName: session.playerName, celebName: data.celebs[i] });
            }
            rooms[data.roomCode].players[session.playerName].suggestionsSubmitted = true;
        }
        //6 & 7
        else if (gameState.type === "inLobby" && data.event === "startGame") {
            //let room = rooms[data.roomCode];
            clearInterval(session.lobbyInterval);
            console.log("StartGame ", session.room);
            if (session.playerName !== session.room.vip) {
                console.log("Cant Start", session.playerName);
                return;
            }
            gameState.type = "inGame";
            session.room.playerOrder = shuffle(Object.keys(session.room.players));
            for (var i = 0, l = session.room.playerOrder.length; i < l; i += 2) {
                session.room.team1.members[i / 2] = session.room.playerOrder[i];
                session.room.team2.members[i / 2] = session.room.playerOrder[i + 1];
            }
            if (session.room.playerOrder.length % 2) {
                session.room.team2.members.pop();
            }
            session.room.currentDescriber = session.room.playerOrder[session.room.currentPlayerIndex];
            emitRoom(session.room, { type: "gameStarted", team1: session.room.team1.members, team2: session.room.team2.members });
            emitPlayer(session.room.players[session.room.currentDescriber], { type: "yourRound" });
            emitRoom(session.room, { type: "currentDescriber", currentDescriber: session.room.currentDescriber });
        }
        //8
        else if (gameState.type === "inGame" && data.event === "startRound") {
            session.room.celebrities = shuffle(session.room.celebrities);
            emitRoom(session.room, { type: "roundStarted" });
            emitPlayer(session.room.players[session.room.currentDescriber], { type: "nextCeleb", celeb: session.room.celebrities[0].celebName });
            session.roundTimer = setTimeout(function () {
                emitPlayer(session.room.players[session.room.currentDescriber], { type: "endRound" });
                //emitRoom(session.room, { type: "roundEnded", team1Score: session.room.team1.score, team2Score: session.room.team2.score });
                session.room.currentPlayerIndex += 1;
                if (session.room.currentPlayerIndex === session.room.playerOrder.length) {
                    session.room.currentPlayerIndex = 0;
                }
                session.room.currentDescriber = session.room.playerOrder[session.room.currentPlayerIndex];
                emitRoom(session.room, { type: "currentDescriber", currentDescriber: session.room.currentDescriber });
                emitPlayer(session.room.players[session.room.currentDescriber], { type: "yourRound" });
            }, session.room.roundDuration);
        }
        //9
        else if (gameState.type === "inGame" && data.event === "requestCeleb") {
            score(session.room);
            emitRoom(session.room, { type: "celebGuessed", celeb: session.room.celebrities[0].celebName });
            session.room.guessedCelebrities.push(session.room.celebrities.shift());
            session.room.currentDescriber = session.room.playerOrder[session.room.currentPlayerIndex];
            if (session.room.celebrities.length === 0) {
                clearInterval(session.roundTimer);
                gameState.type = "end";
                emitRoom(session.room, { type: "gameEnded", celebrities: session.room.guessedCelebrities });
            } else {
                emitPlayer(session.room.players[session.room.currentDescriber], { type: "nextCeleb", celeb: session.room.celebrities[0].celebName });
            }
        }
        //10
        else if (gameState.type === "inGame" && data.event === "passCeleb") {
            emitRoom(session.room, { type: "celebPassed" });
            if (session.room.celebrities.length === 0) {
                emitPlayer(session.room.players[session.room.currentDescriber], { type: "nextCeleb", celeb: session.room.celebrities[0].celebName });
            } else {
                let passCeleb = session.room.celebrities.shift();
                emitPlayer(session.room.players[session.room.currentDescriber], { type: "nextCeleb", celeb: session.room.celebrities[0].celebName });
                session.room.celebrities.push(passCeleb);
            }
        }
    
        /*else if (gameState.type === "end" && data.event === "endGame") {
            gameState.type === "end";
            emitRoom(session.room, { type: "gameEnded" });
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