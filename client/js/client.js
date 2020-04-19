
/*
gameState = {
 {
  type: "inlobby",.
  playerNameEntered: false,
 },
 {
 type: "ingame",.
 celebNamesEntered: false,
 },
 {
 type: "end",
 },
}
switch gameState.type {
case "inlobby":
 if (gameState.hasEnteredNames) {
 
}    
case "ingame":

}
*/
var socket = io();
var roomCode;
var gameState;

function gameMaster() {
    switch (gameState.type) {
        case "in-lobby":
            if (gameState.playerNameEntered) {

            } else {

            };
            break;
        case "in-game":
            if (gameState.celebNamesEntered) {

            } else {

            };
            break;
        case "end":
            break;
        default:
            console.log("Error regarding " + gameState);
    };
};

function createRoom() {
    
}

//Create or Join a Room
$("#create-room-button").click(function() {
    //$("#rooms").css("display", "none");
    var playerName = $("#player-name").val(),
        cookie = 1234;
    socket.emit('createRoom', { playerName: playerName, cookie: cookie });
    
    //roomCode = $("#join-room").val();
});

$("#join-room-button").click(function() {
    var playerName = $("#player-name").val(),
        cookie = 1234;
    roomCode = $("#join-room").val();
    socket.emit('joinRoom', {playerName: playerName, cookie: cookie, roomCode: roomCode});
});

//Submit Celebrity Names
$("#celeb-name-button").click(function() {
    console.log(roomCode);
    var firstCelebName = $("#first-celeb-name").val(),
        secondCelebName = $("#second-celeb-name").val();
    if (firstCelebName === '' || secondCelebName === '') {
        alert("Two Names Please!");
    } else {
        socket.emit('celebNames', { firstCelebName: firstCelebName, secondCelebName: secondCelebName, roomCode: roomCode});
    };
});

$("#start-game-button").click(function() {
    socket.emit("startGame", { roomCode: roomCode});
})

//Server Responses

socket.on('roomCreated', function(data) {
    console.log(data.roomCode);
    roomCode = data.roomCode;
});

socket.on('error2', function(data) {
    console.log(data);
});

socket.on('joinedPlayers', function(data) {
    $("#container").append(data.players);
});

socket.on('shuffledCelebs', function(data) {
    $("#cotainer").append(data.shuffled);
});

socket.on('msg', function(data) {
    console.log(data.celeb);
});

socket.ob('gameStarted', function(data) {
    $("#container").append(data);
});