import express from "express";
import SocketIO from "socket.io";
import http from "http";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));


const httpServer = http.createServer(app); //http server
const wsServer = SocketIO(httpServer);

wsServer.on("connection", socket => { //프론트로부터 소켓 받을 준비
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (roomName, done) => { 
    socket.join(roomName);  //채팅방 join
    done();
    socket.to(roomName).emit("welcome");
  });
});

/* const sockets = [];
const wss = new WebSocket.Server({ server }); //webSocket server
wss.on("connection", (socket) => {
  sockets.push(socket);
  socket["nickname"] = "Anon"
  console.log("Connected to Browser");
  socket.on("close", () => console.log('Disconnected from the Browser'));
  socket.on("message", (msg) => {
    const message = JSON.parse(msg);
    switch (message.type) {
      case "new_message":
        sockets.forEach((aSocket) => aSocket.send(`${socket.nickname}: ${message.payload}`));
        break;
        case "nickname":
        socket["nickname"] = message.payload;
        break;
    }
  });
}); */

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);