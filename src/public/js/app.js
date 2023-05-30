const socket = io();  //io function은 알아서 socket.io를 실행하고 있는 서버를 찾음

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

function handleRoomSubmit(event){
  event.preventDefault();
  const input = form.querySelector("input");

  //1. 특정한 이벤트를 어떤 이름이든 상관 없이 emit할 수 있고, 2. object를 보낼수 있음
  socket.emit("enter_room", { payload: input.value }, () => {
    console.log("server is done!");
  }); 

}

form.addEventListener("submit", handleRoomSubmit);