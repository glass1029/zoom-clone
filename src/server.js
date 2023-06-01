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

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const publicRooms = [];
  rooms.forEach((_, key) => { //value값은 사용하지 않고 key만 필요
    if(sids.get(key) === undefined){  //rooms에는 public, private 둘 다 존재, sids에는 private만 존재
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

wsServer.on("connection", socket => { //프론트로부터 소켓 받을 준비
  socket["nickname"] = "Anon";
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (roomName, done) => { 
    socket.join(roomName);  //채팅방 join
    done();
    socket.to(roomName).emit("welcome", socket.nickname); //하나의 특정 socket에게
    wsServer.sockets.emit("room_change", publicRooms());  //모든 socket에게
  });
  socket.on("disconnecting", () => { //socket이 방을 떠나기 바로 직전에 실행
    socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname));
  });
  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });
  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });
  socket.on("nickname", nickname => socket["nickname"] = nickname);
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