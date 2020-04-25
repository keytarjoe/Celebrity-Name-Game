
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

{
    type: create-button-clicked
}
*/
var socket = io();
var gameState = {
    type: "start"
};

function handleEvent(event) {
    console.log(gameState.type + " and "+ event.type);
    //1
    if (gameState.type === "start" && event.type === "create-button-clicked") {
        var cookie = 1234;
        socket.emit('clientEvent',
        {
            playerName: event.playerName, 
            cookie: cookie,
            event: "createRoom"
        });
    }
    //2
    else if (gameState.type === "start" && event.type === "join-button-clicked") {
        gameState.roomCode = event.roomCode;
        var cookie = 1234;
        socket.emit('clientEvent',
        {
            playerName: event.playerName,
            cookie: cookie,
            roomCode: event.roomCode,
            event: "joinRoom"
        });
    }
    //3
    else if (gameState.type === "start" && event.type === "room-created") {
        gameState.type = "in-lobby";
        gameState.roomCode = event.roomCode; //Change
        $("#container").prepend(event.roomCode);
        $("#login-container").hide();
        $("#lobby-container").show();
        //socket.emit('clientEvent', {event: "lobbyPhase"});
    }
    //4
    else if (gameState.type === "start" && event.type === "room-joined") {
        gameState.type = "in-lobby";
        $("#login-container").hide();
        $("#lobby-container").show();
        //socket.emit('clientEvent', {event: "lobbyPhase"});
    }
    //5
    else if (gameState.type === "in-lobby" && event.type === "celeb-button-clicked") {
        socket.emit('clientEvent',
        {
            firstCelebName: event.firstCelebName,
            secondCelebName: event.secondCelebName,
            roomCode: gameState.roomCode,
            event: "celebNames"
        });
    }
    //6
    else if (gameState.type === "in-lobby" && event.type === "start-button-clicked") {
        socket.emit("clientEvent", {roomCode: gameState.roomCode, event: "startGame"});
    }
    //7
    else if (gameState.type === "in-lobby" && event.type === "game-started") {
        gameState.type = "in-game";
        $("#lobby-container").hide();
        $("#game-container").show();
    }
    //8
    else if (gameState.type === "in-game" && event.type === "next-celeb-button-clicked" && gameState.myTurn) {
        socket.emit('clientEvent', {event: "requestCeleb"});
    }

    else if (gameState.type === "in-game" && event.type === "take-turn") {
        gameState.myTurn = true;
        $("#my-turn-container").show();
        $("#celeb-name").html("Describe " + event.celeb);
        console.log("Describe " + event.celeb);
    }

    else if (gameState.type === "in-game" && event.type === "next-celeb" && gameState.myTurn) {
        console.log("Describe " + event.celeb);
        $("#celeb-name").html("Describe " + event.celeb);
    }

    else if (gameState.type === "in-game" && event.type === "celeb-guessed") {
        console.log(event.celeb + " guessed!");
        $("#message").append("<br />" + event.celeb + " guessed!");
    }
    //9
    else if (gameState.type === "in-game" && event.type === "pass-celeb-button-clicked" && gameState.myTurn) {
        socket.emit('clientEvent', {event: "passCeleb"});
    }

    else if (gameState.type === "in-game" && event.type === "celeb-passed") {
        console.log("Celebrity passed!");
        $("#message").append("<br />Celebrity passed!");
    }

    else {
        console.log("Game State " + gameState + " Unhandled event" + event + "Error");
    };
    
};

//Button Clicks

//Create or Join a Room
$("#create-room-button").click(function () {
    var playerName = $("#player-name").val();
    if (playerName === "" ) {
        console.log("HEY YOUR NAME IDIOTLASK Hfujkgh ku");
        return;
    } 
    handleEvent({ type: "create-button-clicked", playerName: playerName });
});

$("#join-room-button").click(function () {
    let playerName = $("#player-name").val();
    let roomCode = $("#join-room").val();
    if (playerName === "" || roomCode === "") {
        console.log("HEY IDIOTLASK Hfujkgh ku");
        return;
    } 
    handleEvent({ type: "join-button-clicked", playerName: playerName, roomCode: roomCode });
});

//Submit Celebrity Names
$("#celeb-name-button").click(function () {
    var firstCelebName = $("#first-celeb-name").val();
    var secondCelebName = $("#second-celeb-name").val();
    if (firstCelebName === '' || secondCelebName === '') {
        alert("Two Names Please!");
    } else {
        handleEvent({ type: "celeb-button-clicked", firstCelebName: firstCelebName, secondCelebName: secondCelebName });
    };
});

$("#start-game-button").click(function () {
    handleEvent({ type: "start-button-clicked" });
});

$("#next-celeb-button").click(function () {
    handleEvent({type: "next-celeb-button-clicked"});
});

$("#pass-celeb-button").click(function () {
    handleEvent({type: "pass-celeb-button-clicked"});
});

//Server Responses

socket.on('roomCreated', function (data) {
    handleEvent({ type: "room-created", roomCode: data.roomCode });
});

socket.on('roomJoined', function (data) {
    handleEvent({ type: "room-joined" });
});

socket.on('gameStarted', function (data) {
    handleEvent({type: "game-started" });
});

socket.on('takeTurn', function (data) {
    handleEvent({type: "take-turn", celeb: data.celeb});
});

socket.on('celebGuessed', function (data) {
    handleEvent({type: "celeb-guessed", celeb: data.celeb});
});

socket.on('nextCeleb', function (data) {
    handleEvent({type: "next-celeb", celeb: data.celeb});
});

socket.on('celebPassed', function (data) {
    handleEvent({type: "celeb-passed"});
});

socket.on('error2', function (data) {
    console.log(data);
});