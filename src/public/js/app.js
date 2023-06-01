const socket = io();  //io function은 알아서 socket.io를 실행하고 있는 서버를 찾음

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;

function addMessage(message){
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
}

function handleNicknameSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#name input");
  const value = input.value;
  socket.emit("nickname", input.value);
}

function showRoom(){
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName}`;
  const msgForm = room.querySelector("#msg");
  // const nameForm = room.querySelector("#name");
  msgForm.addEventListener("submit", handleMessageSubmit);
  // nameForm.addEventListener("submit", handleNicknameSubmit);
}

function handleRoomSubmit(event){
  event.preventDefault();
  const input = form.querySelector("input");
  socket.emit(
    "enter_room", //특정한 이벤트를 어떤 이름이든 상관 없이 emit할 수 있음
    input.value,  //string뿐 아니라 object 등 다양한 형태를 보낼 수 있고, 여러 개의 argument를 보낼 수 있음
    showRoom, //function은 가장 마지막 argument로 보내야만 함
  ); 
  roomName = input.value;
  input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${user} arrived!`);
});

socket.on("bye", (left, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount}`;
  addMessage(`${left} left...`);
});

socket.on("new_message", addMessage);
//socket.on("room_change", console.log); // (msg) => { console.log(msg) } 와 동일
socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerText = "";
  if(rooms.length === 0){  //room이 하나도 없을 때
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  });
})
