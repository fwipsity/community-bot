const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

//backup the bank

let bankDB = new sqlite3.Database("data/bankDB.db");
let dataDB = new sqlite3.Database("data/database.db");

bankDB.run("CREATE TABLE IF NOT EXISTS bank(username VARCHAR(50), bank INTEGER);");

dataDB.each("SELECT * FROM users", (err, user) => {
    bankDB.get("SELECT * FROM bank WHERE username = ?", [user.username], (err, result) => {
        if (result) {
            bankDB.run(`INSERT INTO bank(username, bank) VALUES ('${user.username}', ${result.bank + user.bank})`);
        } else {
            bankDB.run(`INSERT INTO bank(username, bank) VALUES ('${user.username}', ${user.bank})`);
        }
    })
    dataDB.run("DROP TABLE IF EXISTS chat;")
    dataDB.run("DROP TABLE IF EXISTS users;")
    dataDB.run("DROP TABLE IF EXISTS activity;")
});