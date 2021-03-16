const sqlite3 = require("sqlite3");


console.log("satring socket server on port 3000...")
const io = require("socket.io")(3000, {
    cors: {
        origin: "*",
    },
});


let sockets = {};

io.sockets.on("connection", (socket) => {
    socket.emit("start", "connected");
    socket.on("identify", (data) => {
        if (!sockets[data]) {
            sockets[data] = [];
        }
        sockets[data].push(socket);
    });

    io.sockets.on("disconnect", () => {
        for (target of sockets) {
            for (let i = 0; i < target.length; i++) {
                if (target[i] == socket) {
                    target.splice(i, 1);
                    return;
                }
            }
        }
    });
});


module.exports = function send(target, eventName, content) {
    console.log("send");
    if (sockets[target]) {
        sockets[target].forEach(socket => {
            socket.emit(eventName, content)
        });
    }
}