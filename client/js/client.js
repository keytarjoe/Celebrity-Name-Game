var socket = io();
var gameState = {
	type: "start",
};

//Event Handler

function handleEvent(event) {
	console.log(gameState.type + " and " + event.type);
	//1

	if (gameState.type === "start" && event.type === "createButtonClicked") {
		gameState.playerName = event.playerName;
		socket.emit("clientEvent", {
			playerName: event.playerName,
			roundDuration: event.roundDuration,
			numberOfSuggestions: event.numberOfSuggestions,
			event: "createRoom",
		});
	}
	//2
	else if (gameState.type === "start" && event.type === "joinButtonClicked") {
		gameState.roomCode = event.roomCode;
		gameState.playerName = event.playerName;
		socket.emit("clientEvent", {
			playerName: event.playerName,
			roomCode: event.roomCode,
			event: "joinRoom",
		});
	}
	//3
	else if (gameState.type === "start" && event.type === "roomCreated") {
		gameState.type = "inLobby";
		gameState.roomCode = event.roomCode; //Change
		gameState.numberOfSuggestions = event.numberOfSuggestions;
		gameState.roundDuration = event.roundDuration;
		gameState.vip = true;
		render("renderLobby");
	}
	//4
	else if (gameState.type === "start" && event.type === "roomJoined") {
		gameState.type = "inLobby";
		console.log(gameState.numberOfSuggestions);
		console.log(gameState.roundDuration);
		gameState.numberOfSuggestions = event.numberOfSuggestions;
		gameState.roundDuration = event.roundDuration;
		render("renderLobby");
	}
	//
	else if (gameState.type === "inLobby" && event.type === "refreshPlayers") {
		render("renderPlayers", { refreshList: event.refreshList });
	}
	//5
	else if (
		gameState.type === "inLobby" &&
		event.type === "celebNameButtonClicked"
	) {
		render("clearCelebContainer");
		socket.emit("clientEvent", {
			celebs: event.celebs,
			roomCode: gameState.roomCode,
			playerName: gameState.playerName,
			event: "celebNames",
		});
	}
	//6
	else if (
		gameState.type === "inLobby" &&
		event.type === "startGameButtonClicked"
	) {
		socket.emit("clientEvent", {
			roomCode: gameState.roomCode,
			event: "startGame",
		});
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
		render("renderGame");
	}
	//8
	else if (gameState.type === "inGame" && event.type === "currentDescriber") {
		gameState.currentDescriber = event.currentDescriber;
		if (gameState.currentDescriber === gameState.playerName) {
			gameState.myTurn = true;
		} else {
			gameState.myTurn = false;
		}
		render("renderMessage", { type: "currentDescriber" });
	} else if (gameState.type === "inGame" && event.type === "roundStarted") {
		render("renderTurn");
	} else if (gameState.type === "inGame" && event.type === "yourRound") {
		render("renderRound", { type: "alert" });
	}
	//9
	else if (
		gameState.type === "inGame" &&
		event.type === "startRoundButtonClicked"
	) {
		socket.emit("clientEvent", { event: "startRound" });
		render("renderRound", { type: "controls" });
	}
	//10
	else if (
		gameState.type === "inGame" &&
		event.type === "nextCelebButtonClicked" &&
		gameState.myTurn
	) {
		socket.emit("clientEvent", { event: "requestCeleb" });
	} else if (
		gameState.type === "inGame" &&
		event.type === "nextCeleb" &&
		gameState.myTurn
	) {
		render("renderCelebName", { celeb: event.celeb });
	} else if (gameState.type === "inGame" && event.type === "celebGuessed") {
		render("updateCelebFeed", { type: "guessed", celeb: event.celeb });
	}
	//9
	else if (
		gameState.type === "inGame" &&
		event.type === "passCelebButtonClicked" &&
		gameState.myTurn
	) {
		socket.emit("clientEvent", { event: "passCeleb" });
	} else if (gameState.type === "inGame" && event.type === "celebPassed") {
		render("updateCelebFeed", { type: "passed" });
	} else if (
		gameState.type === "inGame" &&
		event.type === "endRound" &&
		gameState.myTurn
	) {
		gameState.myTurn = false;
		render("renderRound", { type: "clear" });
	} else if (gameState.type === "inGame" && event.type === "scoreUpdate") {
		render("updateScore", { team: event.team, teamScore: event.teamScore });
	} else if (gameState.type === "inGame" && event.type === "gameEnded") {
		gameState.type = "end";
		render("renderEndGame", { celebrities: event.celebrities });
	} else if (event.type === "reconnect") {
		gameState.type = event.reconnectData.type;
		gameState.numberOfSuggestions = event.reconnectData.numberOfSuggestions;
		gameState.roundDuration = event.reconnectData.roundDuration;
		gameState.playerName = event.reconnectData.playerName;
		gameState.roomCode = event.reconnectData.roomCode;
		gameState.myTeam = event.reconnectData.myTeam;
		gameState.currentDescriber = event.reconnectData.currentDescriber;
		gameState.team1 = event.reconnectData.team1;
		gameState.team2 = event.reconnectData.team2;
		if (event.reconnectData.vip === gameState.playerName) {
			gameState.vip = true;
		}
		if (gameState.currentDescriber === gameState.playerName) {
			gameState.myTurn = true;
		} else {
			gameState.myTurn = false;
		}
		if (gameState.type === "inLobby") {
			render("renderLobby");
		} else if (gameState.type === "inGame") {
			render("renderGame");
			render("renderTurn");
			if (gameState.myTurn) {
				render("renderRound", { type: "alert" });
			}
		}
		console.log(gameState);
	} else {
		console.log(
			"Client: Game State ",
			gameState,
			" Unhandled event",
			event,
			"Error"
		);
	}
}

//Button Clicks

$("#createRoomButton").click(function () {
	let playerName = $("#playerName").val();

	if (playerName === "") {
		console.log("HEY YOUR NAME IDIOTLASK Hfujkgh ku");
		window.alert("What's your name, dumbass?");
		return;
	}

	let numberOfSuggestions =
		$("#numberOfSuggestions").val() === undefined
			? 4
			: $("#numberOfSuggestions").val();
	let roundDuration =
		$("#roundDuration").val() === undefined
			? 30
			: $("#roundDuration").val();

	// console.log(numberOfSuggestions.toString());
	// console.log(roundDuration.toString());

	handleEvent({
		type: "createButtonClicked",
		playerName: playerName,
		numberOfSuggestions: numberOfSuggestions,
		roundDuration: roundDuration,
	});
});

$("#joinRoomButton").click(function () {
	let playerName = $("#playerName").val();
	let roomCode = $("#joinRoom").val().toUpperCase();
	if (playerName === "" || roomCode === "") {
		console.log("HEY IDIOTLASK Hfujkgh ku");
		if (playerName === "" && roomCode === "") {
			window.alert("Don't be stupid, dumbass.");
		} else if (playerName === "" && roomCode !== "") {
			window.alert("Enter your name, dumbass.");
		} else if (roomCode === "" && playerName !== "") {
			window.alert("Enter the room code, dumbass.");
		}

		return;
	}
	handleEvent({
		type: "joinButtonClicked",
		playerName: playerName,
		roomCode: roomCode,
	});
});

$("#celebSuggestionButton").click(function () {
	let celebArray = [];
	let celebNumber = 1;
	for (i = 0; i < gameState.numberOfSuggestions; i++) {
		celebArray[i] = $("#celebSuggestion-" + celebNumber).val();
		celebNumber += 1;
	}
	handleEvent({ type: "celebNameButtonClicked", celebs: celebArray });
});

$("#startGameButton").click(function () {
	handleEvent({ type: "startGameButtonClicked" });
});

$("#startRoundButton").click(function () {
	handleEvent({ type: "startRoundButtonClicked" });
});

$("#nextCelebButton").click(function () {
	handleEvent({ type: "nextCelebButtonClicked" });
});

$("#passCelebButton").click(function () {
	handleEvent({ type: "passCelebButtonClicked" });
});

//Server Responses

socket.on("serverEvent", function (data) {
	handleEvent(data);
});
