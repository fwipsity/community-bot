const tmi = require('tmi.js');
require("dotenv").config();
const Random = require("../modules/random.js");
const sqlite3 = require("sqlite3").verbose();
const httpRequest = require("http");
const fs = require("fs");


console.log("loading data for twitch bot");
const commandData = JSON.parse(fs.readFileSync("data/commandData.json"));

const goldData = JSON.parse(fs.readFileSync("data/gold.json"));

const shopData = JSON.parse(fs.readFileSync("data/shop.json"));

let onlineUsers = [];

const channel = "jumpylion8";

let db = new sqlite3.Database("./data/database.db");
db.run("DROP TABLE IF EXISTS chat;");
db.run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username VARCHAR(50), gold INTEGER, level INTEGER, bank INTEGER, following BOOLEAN);`);
db.run(`CREATE TABLE IF NOT EXISTS activity(id INTEGER, activityType TEXT, time FLOAT);`);
db.run(`CREATE TABLE IF NOT EXISTS chat(id INTEGER, time FLOAT);`);




// Define configuration options
const opts = {
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: process.env.TWITCH_TOKEN
    },
    channels: [
        channel
    ]
};

let eventFunc = (target, eventName, eventContent) => {};
module.exports = eventFunc;

function event(target, eventName, eventContent) {
    console.log(eventFunc);
    eventFunc(target, eventName, eventContent);
}

// Create a client with our options
const client = new tmi.Client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on("join", onJoin);
client.on("part", onLeave);


// Connect to Twitch:
client.connect();
// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    const username = context.username;

    /*event("streamManager", "chat-message", {
        user: context.username,
        color: context.color,
        msg: msg
    });*/

    checkExistance(username, (userData) => {
        db.run(`INSERT INTO chat(id, time) VALUES(${userData.id}, ${Date.now() / 1000})`);
        // Remove whitespace from chat message and lowercase
        const commandName = msg.trim().toLowerCase();

        for (let normalCommand in commandData.normal) {
            if (normalCommand === commandName) {
                console.log(`${username} used the ${normalCommand} command in ${target}`);
                client.say(target, commandData.normal[normalCommand].response);
                return;
            }
            if (commandData.normal[normalCommand].aliays !== undefined) {
                for (let i = 0; i < commandData.normal[normalCommand].aliays.length; i++) {
                    if (commandData.normal[normalCommand].aliays[i] === commandName) {
                        console.log(`${username} used the ${normalCommand} command in ${target}`);
                        client.say(target, commandData.normal[normalCommand].response);
                        return;
                    }
                }
            }
        }

        if (commandName === "!ping") {
            if (Random.randint(0, 10) === 0) {
                client.say(target, `pong!`);
            } else {
                client.ping().then((e) => {
                    console.log(`${username} used the ping command in ${target}`);
                    client.say(target, `The server ping is ${e[0]}!`)
                });
            }
        }

        if (commandName === "!gold") {
            db.get(`SELECT gold FROM users WHERE username = ?`, [username], (err, result) => {
                if (err !== null) {
                    console.log(err);
                } else {
                    console.log(`${username} used the gold command in ${target}`);
                    client.say(target, `@${username} you got ${result.gold} gold!`);
                }

            });
        }
        let commandParts = commandName.split(" ");
        if (commandParts[0] === "!claim") {
            if (commandParts[1] === "start") {

                db.get("SELECT * FROM activity WHERE id = ? AND activityType = ?", [userData.id, "startClaim"], (err, result) => {

                    if (err) {
                        console.log(err);
                    }

                    if (result === undefined) {
                        db.run(`UPDATE users SET gold = ${userData.gold + goldData.startBonus}`);
                        db.run(`INSERT INTO activity(id, activityType, time) VALUES (${userData.id}, 'startClaim',  ${Date.now()/60000});`);

                        client.say(target, `@${username} you got more ${goldData.startBonus} gold by claiming at the start!`);

                    } else if (result.time < Date.now() / 60000 - 240) {
                        db.run(`DELETE FROM activity WHERE id = ${result.id} AND activityType = 'startClaim' AND time = ${result.time}`);
                        db.run(`UPDATE users SET gold = ${userData.gold + goldData.startBonus}`);
                        db.run(`INSERT INTO activity(id, activityType, time) VALUES (${userData.id}, 'startClaim', ${Date.now()/60000});`);
                        client.say(target, `@${username} you got more ${goldData.startBonus} gold by claiming at the start!`);
                    } else {
                        client.say(target, "This claim type is on cooldown!");
                    }
                });
            }
        }


        if (commandParts[0] === "!buy") {
            commandParts.splice(0, 1);
            let chosenItem = commandParts.join(" ");
            for (let item in shopData) {
                if (item === chosenItem && userData.gold >= shopData[item].price) {
                    if (userData.gold >= shopData[item].price) {
                        db.run(`UPDATE users SET gold = ${userData.gold - shopData[item].price} WHERE id = ${userData.id}`);
                        switch (item) {
                            case "emote-only-chat":
                                client.emoteonly(channel);
                                setTimeout(() => {
                                    client.emoteonlyoff(channel);
                                }, 10 * 1000)
                                break;
                        }
                        return;
                    } else {
                        client.say(target, `@${userData.username} you dont have enough gold to buy this item!`);
                    }

                }
            }
            client.say(target, `@${userData.username} you tried to buy an unknown item!`);
        }

        if (commandParts[0] === "!bank") {
            function returnAmount(str) {
                if (str.endsWith("g")) {
                    str = str.slice(0, str.length - 1);
                }
                let amount = parseInt(str);
                if (isNaN(str)) {
                    client.say(target, `@${userData.username} the amount of gold should be a number!`);
                    return;
                }
                return amount;
            }

            if (commandParts[1] === "deposit") {
                let amount = returnAmount(commandParts[2]);
                if (userData.gold >= amount) {
                    db.run(`UPDATE users SET bank = ${userData.bank + amount} , gold = ${userData.gold - amount} WHERE id = ${userData.id}`);
                    client.say(target, `@${userData.username} successfully deposited ${amount}g!`);
                } else {
                    client.say(target, `@${userData.username} you dont have enough gold!`);
                }

            } else if (commandParts[1] === "withdraw") {
                let amount = returnAmount(commandParts[2]);
                if (userData.bank >= amount) {
                    db.run(`UPDATE users SET gold = ${userData.gold + amount} , bank = ${userData.bank - amount} WHERE id = ${userData.id}`);
                    client.say(target, `@${userData.username} successfully withdrawen ${amount}g!`);
                } else {
                    client.say(target, `@${userData.username} you dont have enough gold in your bank!`);
                }

            } else if (commandParts[1] === "status") {
                client.say(target, `@${userData.username} you have ${userData.bank}g in your bank!`);
            }
        }


        if (commandParts[0] === "!give") {
            let username = commandParts[1];
            if (commandParts[1].startsWith("@")) {
                username = commandParts[1].slice(1, commandParts[1].length);
            }
            db.get("SELECT * FROM users WHERE username = ?", [username], (err, result) => {
                if (err) {
                    console.log(err);
                }
                if (result) {
                    let strAmount = commandParts[2];
                    if (commandParts[2].endsWith("g")) {
                        strAmount = commandParts[2].slice(0, commandParts[2].length - 1);
                    }
                    let amount = parseInt(strAmount);
                    if (isNaN(strAmount)) {
                        client.say(target, `@${userData.username} the amount of gold should be a number!`);
                        return;
                    }
                    if (userData.gold >= amount) {
                        db.run(`UPDATE users SET gold = ${userData.gold - amount} WHERE id = ${userData.id}`);
                        db.run(`UPDATE users SET gold = ${result.gold + amount} WHERE id = ${result.id}`);
                        client.say(target, `you seccessfully gave @${username} ${amount}g!`)
                    }
                }
            });
        }


    });
}



// gold loop
setInterval(() => {
    //db.
    db.each("SELECT * FROM chat WHERE time > ?", [Date.now() / 1000 - 600], (err, result) => {
        if (result) {
            let id = result.id;
            if (err) {
                console.log(err);
            } else {
                db.get("SELECT username, gold FROM users WHERE id = ?", [id], (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        if (onlineUsers.includes(result.username)) {
                            db.run(`UPDATE users SET gold = ${result.gold + 10} WHERE id = ${id}`);
                        }
                    }
                });
            }
        }
    });
}, goldData.goldLoop.loopTime * 1000);

function onJoin(channel, username, self) {
    console.log(`${username} has joined ${channel}`);
    onlineUsers.push(username);
    checkExistance(username);
}

function onLeave(channel, username, self) {
    console.log(`${username} has left ${channel}`);
    onlineUsers.splice(onlineUsers.indexOf(username), 1);

}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}


function checkExistance(username, callback = (id) => {}) {
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, result) => {
        if (err) {
            console.log(err);
        }
        if (result === undefined || result === null) {
            db.run(`INSERT INTO users(username, gold, level) VALUES ('${username}', ${goldData.startAmount}, 1)`, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, result) => {
                        if (err) {
                            console.log(err);
                        } else {
                            callback(result);
                        }
                    });
                }
            });
        } else {
            callback(result);
        }
    });
}