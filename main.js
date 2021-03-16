console.log("starting");

console.log("starting the main server");
const server = require("./socket server/main-server.js");

console.log(server);

console.log("stating twitch bot...");
const twitchBot = require("./twitch-bot/main-twitch-bot");
twitchBot.eventFunc = server;