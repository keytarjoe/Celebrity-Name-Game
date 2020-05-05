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

//Event Listener
io.on('connection', function (socket) {
    console.log('A user connected');

    var room;

    socket.on('clientEvent', function (data) {
        handleEvent(room, socket, data);
    });

});

http.listen(8888, function () {
    console.log('listening on 8888');
});

var rooms = {};
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
    } else if (room.team2.members.includes(room.currentDescriber)) {
        room.team2.score += 1;
    }
};

function handleEvent(room, socket, data) {

    let playerName;
    let roomCode;
    let roundTimer;
    let lobbyInterval;
    
    console.log("Global variable is ", room);

    //1
    if (data.event === "createRoom") {
        console.log(data);
        roomCode = generateCode();
        playerName = data.playerName;
        let players = {};
        players[data.playerName] = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id };
        let roomObject = {
            gameState: {
                type: "inLobby"
            },
            roomCode: roomCode,
            currentPlayerIndex: 0,
            vip: data.playerName,
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
        room = rooms[roomCode];
        console.log("Room is ", room);
        //gameState.type = "inLobby";
        emitPlayer(players[data.playerName], { roomCode: roomCode, type: "roomCreated" });
        lobbyInterval = setInterval(function() {
            emitRoom(room, { type: 'refreshPlayers', players: Object.keys(room.players) });
        }, 3000);
    }
    //2
    else if (rooms[data.roomCode].gameState.type === "inLobby" && data.event === "joinRoom") {
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
        roomCode = data.roomCode;
        let player = { playerName: data.playerName, cookie: data.cookie, socketId: socket.id };
        rooms[data.roomCode].players[data.playerName] = player;
        console.log(rooms[data.roomCode]);
        //socket.emit('serverEvent', { players: Object.keys(rooms[data.roomCode].players), type: "roomJoined" });
        emitPlayer(room.players[data.playerName], { type: "roomJoined" });
    }
    //5
    else if (room.gameState.type === "inLobby" && data.event === "celebNames") {
        console.log(room);
        if (!(data.roomCode in rooms)) {
            socket.emit('serverEvent', { error: "Room does not exist! bitch", type: "error2" });
            return;
        }
        for ( i = 0; i < data.celebs.length; i++) {
            room.celebrities.push({ playerName: playerName, celebName: data.celebs[i] });
        }
        console.log(room.celebrities);
    }
    //6 & 7
    else if (room.gameState.type === "inLobby" && data.event === "startGame") {
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
        console.log("playerOrder ", room.playerOrder);
        console.log("Team 1 ", room.team1, " and Team 2 ", room.team2);
        room.currentDescriber = room.playerOrder[room.currentPlayerIndex];
        emitRoom(room, { type: "gameStarted", team1: room.team1.members, team2: room.team2.members });
        emitPlayer(room.players[room.currentDescriber], { type: "yourRound" });
        emitRoom(room, { type: "currentDescriber", currentDescriber: room.currentDescriber });
    }
    //8
    else if (room.gameState.type === "inGame" && data.event === "startRound") {
        room.celebrities = shuffle(room.celebrities);
        emitRoom(room, { type: "roundStarted" });
        emitPlayer(room.players[room.currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
        roundTimer = setTimeout(function () {
            emitPlayer(room.players[room.currentDescriber], { type: "endRound" });
            emitRoom(room, { type: "roundEnded", team1Score: room.team1.score, team2Score: room.team2.score });
            room.currentPlayerIndex += 1;
            if (room.currentPlayerIndex === room.playerOrder.length) {
                room.currentPlayerIndex = 0;
            }
            room.currentDescriber = room.playerOrder[room.currentPlayerIndex];
            emitRoom(room, { type: "currentDescriber", currentDescriber: room.currentDescriber });
            emitPlayer(room.players[room.currentDescriber], { type: "yourRound" });
        }, 10000);
    }
    //9
    else if (room.gameState.type === "inGame" && data.event === "requestCeleb") {
        score(room);
        emitRoom(room, { type: "celebGuessed", celeb: room.celebrities[0].celebName });
        room.guessedCelebrities.push(room.celebrities.shift());
        room.currentDescriber = room.playerOrder[room.currentPlayerIndex];
        if (room.celebrities.length === 0) {
            clearInterval(roundTimer);
            gameState.type = "end";
            emitRoom(room, { type: "gameEnded" });
            console.log("Team 1: " + room.team1.score + " and Team 2: " + room.team2.score);
        } else {
            emitPlayer(room.players[room.currentDescriber], { type: "nextCeleb", celeb: room.celebrities[0].celebName });
        }
    }
    //10
    else if (room.gameState.type === "inGame" && data.event === "passCeleb") {
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
