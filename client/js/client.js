var socket = io();
var gameState = {
    type: "start"
};
 

//Event Handler

function handleEvent(event) {
    console.log(gameState.type + " and "+ event.type);
    //1
    if (gameState.type === "start" && event.type === "createButtonClicked") {
        let cookie = 1234;
        socket.emit('clientEvent',
        {
            playerName: event.playerName, 
            cookie: cookie,
            event: "createRoom"
        });
    }
    //2
    else if (gameState.type === "start" && event.type === "joinButtonClicked") {
        gameState.roomCode = event.roomCode;
        let cookie = 1234;
        socket.emit('clientEvent',
        {
            playerName: event.playerName,
            cookie: cookie,
            roomCode: event.roomCode,
            event: "joinRoom"
        });
    }
    //3
    else if (gameState.type === "start" && event.type === "roomCreated") {
        gameState.type = "inLobby";
        gameState.roomCode = event.roomCode; //Change
        $("#container").prepend(event.roomCode);
        $("#login-container").hide();
        $("#lobby-container").show();
        $("#start-game-button").css("display", "block");
        //socket.emit('clientEvent', {event: "lobbyPhase"});
    }
    //4
    else if (gameState.type === "start" && event.type === "roomJoined") {
        gameState.type = "inLobby";
        $("#login-container").hide();
        $("#lobby-container").show();
        //socket.emit('clientEvent', {event: "lobbyPhase"});
    }
    //5
    else if (gameState.type === "inLobby" && event.type === "celebNameButtonClicked") {
        $("#first-celeb-name, #second-celeb-name, #celeb-name-button").hide();
        socket.emit('clientEvent',
        {
            firstCelebName: event.firstCelebName,
            secondCelebName: event.secondCelebName,
            roomCode: gameState.roomCode,
            event: "celebNames"
        });
    }
    //6
    else if (gameState.type === "inLobby" && event.type === "startGameButtonClicked") {
        socket.emit("clientEvent", {roomCode: gameState.roomCode, event: "startGame"});
    }
    //7
    else if (gameState.type === "inLobby" && event.type === "gameStarted") {
        gameState.type = "inGame";
        $("#lobby-container").css("display", "none");
        $("#game-container").css("display", "block");
    }
    //8
    else if (gameState.type === "inGame" && event.type === "yourRound") {
        gameState.myTurn = true;
        $("#my-turn-container").show();
        /*$("#celeb-name").html("Describe " + event.celeb);
        console.log("Describe " + event.celeb);*/
    }
    //9
    else if (gameState.type === "inGame" && event.type === "startRoundButtonClicked") {
        socket.emit("clientEvent", { event: "startRound" });
        $("#next-celeb-button, #pass-celeb-button").show();
        /*setTimeout(function() {
            console.log("No more time");
        }, 10000);*/
        createTimerBar('timerBar', '10s', function() {
            $("#message").append("No more time!");
        });
    }
    //10
    else if (gameState.type === "inGame" && event.type === "nextCelebButtonClicked" && gameState.myTurn) {
        socket.emit('clientEvent', {event: "requestCeleb"});
    }

    else if (gameState.type === "inGame" && event.type === "nextCeleb" && gameState.myTurn) {
        console.log("Describe " + event.celeb);
        $("#celeb-name").html("Describe " + event.celeb);
    }

    else if (gameState.type === "inGame" && event.type === "celebGuessed") {
        console.log(event.celeb + " guessed!");
        $("#message").append("<br />" + event.celeb + " guessed!");
    }
    //9
    else if (gameState.type === "inGame" && event.type === "passCelebButtonClicked" && gameState.myTurn) {
        socket.emit('clientEvent', {event: "passCeleb"});
    }

    else if (gameState.type === "inGame" && event.type === "celebPassed") {
        console.log("Celebrity passed!");
        $("#pass-celeb-button").hide();
        $("#message").append("<br />Celebrity passed!");
    }

    else if (gameState.type === "inGame" && event.type === "endRound" && gameState.myTurn){
        gameState.myTurn = false;
        $("#my-turn-container").css("display", "none");
    }

    else if (gameState.type === "inGame" && event.type === "noPass") {
        $("#celeb-name").html("Out of Passes! Describe " + event.celeb);
    }

    else if (gameState.type === "inGame" && event.type === "gameEnded") {
        gameState.type = "end";
        $("#game-container").css("display", "none");
        $("#end-container").css("display", "block");
    }

    else {
        console.log("Client: Game State ", gameState, " Unhandled event", event, "Error");
    };
    
};

//Button Clicks

$("#create-room-button").click(function () {
    var playerName = $("#player-name").val();
    if (playerName === "" ) {
        console.log("HEY YOUR NAME IDIOTLASK Hfujkgh ku");
        return;
    } 
    handleEvent({ type: "createButtonClicked", playerName: playerName });
});

$("#join-room-button").click(function () {
    let playerName = $("#player-name").val();
    let roomCode = $("#join-room").val();
    if (playerName === "" || roomCode === "") {
        console.log("HEY IDIOTLASK Hfujkgh ku");
        return;
    } 
    handleEvent({ type: "joinButtonClicked", playerName: playerName, roomCode: roomCode });
});

$("#celeb-name-button").click(function () {
    var firstCelebName = $("#first-celeb-name").val();
    var secondCelebName = $("#second-celeb-name").val();
    if (firstCelebName === '' || secondCelebName === '') {
        alert("Two Names Please!");
    } else {
        handleEvent({ type: "celebNameButtonClicked", firstCelebName: firstCelebName, secondCelebName: secondCelebName });
    };
});

$("#start-game-button").click(function () {
    handleEvent({ type: "startGameButtonClicked" });
});

$("#start-round-button").click(function () {
    handleEvent({ type: "startRoundButtonClicked" })
});

$("#next-celeb-button").click(function () {
    handleEvent({ type: "nextCelebButtonClicked" });
});

$("#pass-celeb-button").click(function () {
    handleEvent({ type: "passCelebButtonClicked" });
});

//Server Responses

socket.on('serverEvent', function (data) {
    handleEvent(data);
});

/*if (data.event === "roomCreated") {
    handleEvent({ type: "roomCreated", roomCode: data.roomCode })
}

else if (data.event === "roomJoined") {
    handleEvent({ type: "roomJoined"});
}

else if (data.event === "gameStarted") {
    handleEvent({ type: "gameStarted"});
}

else if (data.event === "yourRound") {
    handleEvent({ type: "yourRound" });
}

else if (data.event === "roundStarted") {
    handleEvent({ type: "round-started"});
}

else if (data.event === "yourTurn") {
    handleEvent({ type: "yourTurn", celeb: data.celeb });
}

else if (data.event === "theirTurn") {
    handleEvent({ type: "theirTurn"})
}

else if (data.event === "celebGuessed") {
    handleEvent({ type: "celebGuessed", celeb: data.celeb });
}

else if (data.event === "nextCeleb") {
    handleEvent({ type: "nextCeleb", celeb: data.celeb });
}

else if (data.event === "celebPassed") {
    handleEvent({ type: "celebPassed"});
}

else if (data.event === "error2") {
    console.log(data);    
}

else {
    console.log("Unhandled event ", data.type);
}*/

/*
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
*/