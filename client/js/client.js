var socket = io();
var roomCode;
/*
{
    lobby: {
        logging-in: ["Joe", "Gabe", "Lee"],
        suggesting: ["Luke", "Sam"]
    },
    in-play: {
        my-turn: [],
        not-my-turn: []
    },
    end: false
}
*/ 
var gameState;

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

/*Submit Player Name
$("#player-name-button").click(function() {
    var playerName = $("#player-name").val();
    
    if (playerName === "") {
        alert("Name Please");
    } else {
        Cookies.set('player', playerName);
        console.log("Cookie is " + Cookies.get('player'));
        $.ajax({
            method: "POST",
            url: "/pushplayer",
            data: {player_name: playerName, room_code: roomCode}
        })
            .done(function() {
                console.log("Player Client Successful");
                $("#login").css("display","none");
                $("#suggestions").css("display", "block");
            });
    };
});*/


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