function render(event, data) {
    //1
    if (event === "renderLobby") {
        $("#roomCodeContainer h3").html("Room Code: " + event.roomCode);
        $("#loginContainer").css("display", "none");
        $("#lobbyContainer").css("display", "flex");
        $("#startGameButton").css("display", "block");
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
    //2
    else if (event === "renderPlayers") {
        $("#playerList").empty();
        for ( i = 0; i < data.refreshList.length; i++) {
            if (data.refreshList[i].submitted) {
                $("#playerList").append("<li><h3>" + data.refreshList[i].playerName + " is ready!</h3></li>");
            } else {
                $("#playerList").append("<li><h3>" + data.refreshList[i].playerName + " is submitting...</h3></li>");
            }
        }
    }
    //3
    else if (event === "clearCelebContainer") {
        $("#celeb-container").css("display", "none");
    }
    //4
    else if (event === "renderGame") {
        $("#lobbyContainer").css("display", "none");
        $("#gameContainer").css("display", "flex");
        //$("#team-container").append("Team 1 is " + event.team1 + " and Team 2 is " + event.team2);
        $("#teamContainer").css("display", "block");
        for (i = 0; i < event.team1.length; i++) {
            $("#team-1").append("<li><h4>" + event.team1[i] + "</h4></li>");
        }
        for (i = 0; i < event.team2.length; i++) {
            $("#team-2").append("<li><h4>" + event.team2[i] + "</h4></li>");
        }
        console.log("Team 1 is " + event.team1 + " and Team 2 is " + event.team2);
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
        $("#myTurnContainer").show();
        $("#startRoundButton").show();
    }
    //8
    else if (event === "renderRound" && data.type === "controls") {
        $("#startRoundButton").hide();
        $("#nextCelebButton, #pass-celeb-button").show();
        duration = gameState.roundDuration / 1000;
        duration = duration.toString().concat("s");
        createTimerBar('timerBar', duration, function() {
            $("#message").html("<h2>No more time!</h2>");
        });
    }
    //9
    else if (event === "renderRound" && data.type === "clear") {
        $("#myTurnContainer").css("display", "none");
        $("#nextCelebButton, #passCelebButton").hide();
        $("#message").empty();
        $("#timerBar").empty();
        $("#celebName").empty();
    }
    //10
    else if (event === "renderCelebName") {
        $("#celeb-name").html(data.celeb);
    }

    //11
    else if (event === "updateCelebFeed" && data.type === "guessed") {
        $("#celebFeed").prepend("<h4>" + event.celeb + " guessed!</h4>");
    }
    //12
    else if (event === "updateCelebFeed" && data.type === "passed") {
      $("#passCelebButton").hide();
      $("#celebFeed").prepend("<h4>Celebrity passed!</h4>");
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
        $("#celebFeedContainer").css("display", "none");
        $("#gameContainer").css("display", "none");
        $("#endContainer").css("display", "block");
        for ( i = 0; i < event.celebrities.length; i++) {
            $("#celebEndList").append(
                "<li><h4>" + event.celebrities[i].celebName +
                " - " + event.celebrities[i].playerName +
                "</h4></li>"
            );
        }
    }

    else {
        console.log("Unhandled Event " + event + " and Unhandled Type " + data.type);
    }

};
