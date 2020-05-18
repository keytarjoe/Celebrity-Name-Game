function render(event, data) {
    //1
    if (event === "renderLobby") {
        $("#room-code-container h3").html("Room Code: " + gameState.roomCode);
        $("#login-container").css("display", "none");
        $("#lobby-container").css("display", "block");
        let celebNumber = 1;
        for (i = 0; i < gameState.numberOfSuggestions; i++) {
            $("#celeb-suggestion-list").append(
                '<li><h2>Celebrity ' + celebNumber + '</h2></li>' +
                '<li><input type="text" placeholder="Celeb Here!" id="celeb-suggestion-' + celebNumber +
                '" class="celeb-suggestion" /></li>'
            )
            celebNumber += 1;
        }
        if (gameState.vip) {
            $("#start-game-button").css("display", "block");
        }
    }
    //2
    else if (event === "renderPlayers") {
        $("#player-list").empty();
        for ( i = 0; i < data.refreshList.length; i++) {
            if (data.refreshList[i].submitted) {
                $("#player-list").append("<li><h3>" + data.refreshList[i].playerName + " is ready!</h3></li>");
            } else {
                $("#player-list").append("<li><h3>" + data.refreshList[i].playerName + " is submitting...</h3></li>");
            }
        }
    }
    //3
    else if (event === "clearCelebContainer") {
        $("#celeb-container").css("display", "none");
    }
    //4
    else if (event === "renderGame") {
        $("#login-container").css("display", "none");
        $("#lobby-container").css("display", "none");
        $("#game-container").css("display", "block");
        $("#team-container").css("display", "block");
        for (i = 0; i < gameState.team1.length; i++) {
            $("#team-1").append("<li><h4>" + gameState.team1[i] + "</h4></li>");
        }
        for (i = 0; i < gameState.team2.length; i++) {
            $("#team-2").append("<li><h4>" + gameState.team2[i] + "</h4></li>");
        }
    }
    //5
    else if (event === "renderMessage" && data.type === "currentDescriber") {
        $("#message").html("<h3>You're up " + gameState.currentDescriber + "!</h3>");
    }
    //6
    else if (event === "renderTurn") {
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
    //7
    else if (event === "renderRound" && data.type === "alert") {
        $("#my-turn-container").show();
        $("#start-round-button").show();
    }
    //8
    else if (event === "renderRound" && data.type === "controls") {
        $("#start-round-button").hide();
        $("#next-celeb-button, #pass-celeb-button").show();
        duration = gameState.roundDuration / 1000;
        duration = duration.toString().concat("s");
        createTimerBar('timerBar', duration, function() {
            $("#message").html("<h2>No more time!</h2>");
        });
    }
    //9
    else if (event === "renderRound" && data.type === "clear") {
        $("#my-turn-container").css("display", "none");
        $("#next-celeb-button, #pass-celeb-button").hide();
        $("#message").empty();
        $("#timerBar").empty();
        $("#celeb-name").empty();
    }
    //10
    else if (event === "renderCelebName") {
        $("#celeb-name").html(data.celeb);
    }

    //11
    else if (event === "updateCelebFeed" && data.type === "guessed") {
        $("#celeb-feed").prepend("<h4>" + data.celeb + " guessed!</h4>");
    }
    //12
    else if (event === "updateCelebFeed" && data.type === "passed") {
        $("#pass-celeb-button").hide();
        $("#celeb-feed").prepend("<h4>Celebrity passed!</h4>");
    }
    //13
    else if (event === "updateScore") {
        if (data.team === "team1") {
            $("#team-1-score").html(data.teamScore);
        } else if (data.team === "team2") {
            $("#team-2-score").html(data.teamScore);
        }
    }
    //14
    else if (event === "renderEndGame") {
        $("#celeb-feed-container").css("display", "none");
        $("#game-container").css("display", "none");
        $("#end-container").css("display", "block");
        for ( i = 0; i < data.celebrities.length; i++) {
            $("#celeb-end-list").append(
                "<li><h4>" + data.celebrities[i].celebName +
                " - " + data.celebrities[i].playerName +
                "</h4></li>"
            );
        }
    }
    
    else {
        console.log("Unhandled Event " + event + " and Unhandled Type " + data.type);
    }

};
