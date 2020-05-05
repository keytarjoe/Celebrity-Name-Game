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
        gameState.playerName = event.playerName;
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
        gameState.playerName = event.playerName;
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
        $("#room-code-container h3").html("Room Code: " + event.roomCode);
        $("#login-container").hide();
        $("#lobby-container").show();
        $("#start-game-button").css("display", "block");
        //socket.emit('clientEvent', {event: "lobbyPhase"});
    }
    //4
    else if (gameState.type === "start" && event.type === "roomJoined") {
        gameState.type = "inLobby";
        $("#room-code-container h3").html("Room Code: " + gameState.roomCode);
        $("#login-container").hide();
        $("#lobby-container").show();
    }
    //
    else if (gameState.type === "inLobby" && event.type === "refreshPLayers") {
        $("#player-list").empty();
        for ( i = 0; i < event.players.length; i++) {
            $("#player-list").append("<li><h3>" + event.players[i] + " is ready!</h3></li>");
        }
    }
    //5
    else if (gameState.type === "inLobby" && event.type === "celebNameButtonClicked") {
        $("#celeb-container").hide();
        socket.emit('clientEvent',
        {
            celebs: [event.firstCelebName, event.secondCelebName],
            roomCode: gameState.roomCode,
            playerName: gameState.playerName,
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
        gameState.team1 = event.team1;
        gameState.team2 = event.team2;
        if (gameState.team1.includes(gameState.playerName)) {
            gameState.myTeam = 1;
        } else if (gameState.team2.includes(gameState.playerName)) {
            gameState.myTeam = 2;
        }
        $("#lobby-container").css("display", "none");
        $("#game-container").css("display", "block");
        //$("#team-container").append("Team 1 is " + event.team1 + " and Team 2 is " + event.team2);
        $("#team-container").css("display", "block");
        for (i = 0; i < event.team1.length; i++) {
            $("#team-1").append("<li><h4>" + event.team1[i] + "</h4></li>");
        }
        for (i = 0; i < event.team2.length; i++) {
            $("#team-2").append("<li><h4>" + event.team2[i] + "</h4></li>");
        }
        console.log("Team 1 is " + event.team1 + " and Team 2 is " + event.team2);
    }
    //8
    else if (gameState.type === "inGame" && event.type === "currentDescriber") {
        gameState.currentDescriber = event.currentDescriber;
        $("#message").html("<p><h3>You're up " + event.currentDescriber + "!</h3></p>");
        if (event.currentDescriber === gameState.playerName) {
            gameState.myTurn = true;
        } else {
            gameState.myTurn = false;
        }
        console.log(event.currentDescriber + " My turn = " + gameState.myTurn);
    }

    else if (gameState.type === "inGame" && event.type === "roundStarted") {
        if (gameState.myTurn === true) {
            $("#message").html("<p><h2>Describe!</h2></p>");
        }
        if (gameState.team1.includes(gameState.currentDescriber) && gameState.team1.includes(gameState.playerName)) {
            $("#message").html("<p><h2>Guess for Team 1!</h2></p>");
        } else if (gameState.team2.includes(gameState.currentDescriber) && gameState.team2.includes(gameState.playerName)) {
            $("#message").html("<p><h2>Guess for Team 2!</h2></p>");
        } else {
            $("#message").html("<p><h2>Don't guess! Other team's turn.</h2></p>");
        }
        
    }

    else if (gameState.type === "inGame" && event.type === "yourRound") {
        $("#my-turn-container").show();
    }
    //9
    else if (gameState.type === "inGame" && event.type === "startRoundButtonClicked") {
        socket.emit("clientEvent", { event: "startRound" });
        $("#next-celeb-button, #pass-celeb-button").show();
        /*setTimeout(function() {
            console.log("No more time");
        }, 10000);*/
        createTimerBar('timerBar', '10s', function() {
            $("#message").append("<p>No more time!</p>");
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
        $("#message").empty();
        $("#timerBar").empty();
    }

    else if (gameState.type === "inGame" && event.type === "noPass") {
        $("#celeb-name").html("Out of Passes! Describe " + event.celeb);
    }

    else if (gameState.type === "inGame" && event.type === "roundEnded") {
        console.log("Team 1: " + event.team1Score + " Team 2: " + event.team2Score);
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