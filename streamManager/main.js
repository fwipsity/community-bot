let socket = io("http://localhost:3000");


socket.on("start", (data) => {
    console.log("connected");
    socket.emit("identify", "streamManager");
})


socket.on("chat-message", (data) => {
    console.log(data);
})

/*
{user: name
color: 
content}
*/