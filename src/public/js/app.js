const socket = io();  //io function은 알아서 socket.io를 실행하고 있는 서버를 찾음

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;

function showRoom(){
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName}`;
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