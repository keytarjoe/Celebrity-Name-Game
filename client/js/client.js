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
            roundDuration: event.roundDuration,
            numberOfSuggestions: event.numberOfSuggestions,
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
        gameState.numberOfSuggestions = event.numberOfSuggestions;
        gameState.roundDuration = event.roundDuration;
        $("#room-code-container h3").html("Room Code: " + event.roomCode);
        $("#login-container").hide();
        $("#lobby-container").show();
        $("#start-game-button").css("display", "block");
        let celebNumber = 1;
        for (i = 0; i < event.numberOfSuggestions; i++) {
            $("#celeb-suggestion-list").append(
                '<li><h2>Celebrity ' + celebNumber + '</h2></li>' +
                '<li><input type="text" placeholder="First Celeb Here!" id="celeb-suggestion-' + celebNumber +
                '" class="celeb-suggestion" /></li>'
            )
            celebNumber += 1;
        }
        //socket.emit('clientEvent', {event: "lobbyPhase"});
    }
    //4
    else if (gameState.type === "start" && event.type === "roomJoined") {
        gameState.type = "inLobby";
        console.log(gameState.numberOfSuggestions);
        console.log(gameState.roundDuration);
        gameState.numberOfSuggestions = event.numberOfSuggestions;
        gameState.roundDuration = event.roundDuration;
        $("#room-code-container h3").html("Room Code: " + gameState.roomCode);
        $("#login-container").hide();
        $("#lobby-container").show();
        let celebNumber = 1;
        for (i = 0; i < event.numberOfSuggestions; i++) {
            $("#celeb-suggestion-list").append(
                '<li><h2>Celebrity ' + celebNumber + '</h2></li>' +
                '<li><input type="text" placeholder="First Celeb Here!" id="celeb-suggestion-' + celebNumber +
                '" class="celeb-suggestion" /></li>'
            )
            celebNumber += 1;
        }
    }
    //
    else if (gameState.type === "inLobby" && event.type === "refreshPlayers") {
        $("#player-list").empty();
        for ( i = 0; i < event.refreshList.length; i++) {
            if (event.refreshList[i].submitted) {
                $("#player-list").append("<li><h3>" + event.refreshList[i].playerName + " is ready!</h3></li>");
            } else {
                $("#player-list").append("<li><h3>" + event.refreshList[i].playerName + " is submitting...</h3></li>");
            }
        }
    }
    //5
    else if (gameState.type === "inLobby" && event.type === "celebNameButtonClicked") {
        $("#celeb-container").hide();
        socket.emit('clientEvent',
        {
            celebs: event.celebs,
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
        $("#message").html("<h3>You're up " + event.currentDescriber + "!</h3>");
        if (event.currentDescriber === gameState.playerName) {
            gameState.myTurn = true;
        } else {
            gameState.myTurn = false;
        }
        console.log(event.currentDescriber + " My turn = " + gameState.myTurn);
    }

    else if (gameState.type === "inGame" && event.type === "roundStarted") {
        if (gameState.myTurn === true) {
            $("#message").html("<h2>Describe</h2>");
        } else if (gameState.team1.includes(gameState.currentDescriber) && gameState.team1.includes(gameState.playerName)) {
            $("#message").html("<h2>Guess for Team 1!</h2>");
        } else if (gameState.team2.includes(gameState.currentDescriber) && gameState.team2.includes(gameState.playerName)) {
            $("#message").html("<h2>Guess for Team 2!</h2>");
        } else {
            $("#message").html("<h2>Don't guess! Other team's turn.</h2>");
        }
        
    }

    else if (gameState.type === "inGame" && event.type === "yourRound") {
        $("#my-turn-container").show();
        $("#start-round-button").show();
    }
    //9
    else if (gameState.type === "inGame" && event.type === "startRoundButtonClicked") {
        socket.emit("clientEvent", { event: "startRound" });
        $("#start-round-button").hide();
        $("#next-celeb-button, #pass-celeb-button").show();
        /*setTimeout(function() {
            console.log("No more time");
        }, 10000);*/
        duration = gameState.roundDuration / 1000;
        duration = duration.toString().concat("s");
        createTimerBar('timerBar', duration, function() {
            $("#message").html("<h2>No more time!</h2>");
        });
    }
    //10
    else if (gameState.type === "inGame" && event.type === "nextCelebButtonClicked" && gameState.myTurn) {
        socket.emit('clientEvent', {event: "requestCeleb"});
    }

    else if (gameState.type === "inGame" && event.type === "nextCeleb" && gameState.myTurn) {
        $("#celeb-name").html(event.celeb);
    }

    else if (gameState.type === "inGame" && event.type === "celebGuessed") {
        console.log(event.celeb + " guessed!");
        $("#celeb-feed").prepend("<h4>" + event.celeb + " guessed!</h4>");
    }
    //9
    else if (gameState.type === "inGame" && event.type === "passCelebButtonClicked" && gameState.myTurn) {
        socket.emit('clientEvent', {event: "passCeleb"});
    }

    else if (gameState.type === "inGame" && event.type === "celebPassed") {
        console.log("Celebrity passed!");
        $("#pass-celeb-button").hide();
        $("#celeb-feed").prepend("<h4>Celebrity passed!</h4>");
    }

    else if (gameState.type === "inGame" && event.type === "endRound" && gameState.myTurn){
        gameState.myTurn = false;
        $("#my-turn-container").css("display", "none");
        $("#message").empty();
        $("#timerBar").empty();
    }

    else if (gameState.type === "inGame" && event.type === "noPass") {
        $("#celeb-name").html("Out of Passes!");
    }

    else if (gameState.type === "inGame" && event.type === "scoreUpdate") {
        if (event.team === "team1") {
            $("#team-1-score").html(event.team1Score);
        } else if (event.team === "team2") {
            $("#team-2-score").html(event.team2Score);
        }
    }

    else if (gameState.type === "inGame" && event.type === "gameEnded") {
        gameState.type = "end";
        $("#celeb-feed-container").css("display", "none");
        $("#game-container").css("display", "none");
        $("#end-container").css("display", "block");
        for ( i = 0; i < event.celebrities.length; i++) {
            $("#celeb-end-list").append(
                "<li><h4>" + event.celebrities[i].celebName +
                " - " + event.celebrities[i].playerName +
                "</h4></li>"
            );
        }
    }

    else {
        console.log("Client: Game State ", gameState, " Unhandled event", event, "Error");
    };
    
};

//Button Clicks

$("#create-room-button").click(function () {
    var playerName = $("#player-name").val();
    var numberOfSuggestions = $("#number-of-suggestions").val();
    var roundDuration = $("#round-duration").val();
    if (playerName === "" ) {
        console.log("HEY YOUR NAME IDIOTLASK Hfujkgh ku");
        return;
    }
    if (!numberOfSuggestions) {
        numberOfSuggestions = 4;
    }
    if (!roundDuration) {
        roundDuration = 30;
    }
    handleEvent({
        type: "createButtonClicked",
        playerName: playerName,
        numberOfSuggestions: numberOfSuggestions,
        roundDuration: roundDuration
    });
});

$("#join-room-button").click(function () {
    let playerName = $("#player-name").val();
    let roomCode = $("#join-room").val().toUpperCase();
    if (playerName === "" || roomCode === "") {
        console.log("HEY IDIOTLASK Hfujkgh ku");
        return;
    } 
    handleEvent({
        type: "joinButtonClicked",
        playerName: playerName,
        roomCode: roomCode
    });
});

$("#celeb-suggestion-button").click(function () {
    let celebArray = [];
    let celebNumber = 1;
    for (i = 0; i < gameState.numberOfSuggestions; i++) {
        celebArray[i] = $("#celeb-suggestion-" + celebNumber).val();
        celebNumber += 1;
    }
    /*if (firstCelebName === '' || secondCelebName === '') {
        alert("Two Names Please!");
    } else {};*/
    handleEvent({ type: "celebNameButtonClicked", celebs: celebArray });
    
});

$("#start-game-button").click(function () {
    handleEvent({ type: "startGameButtonClicked" });
});

$("#start-round-button").click(function () {
    handleEvent({ type: "startRoundButtonClicked" });
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