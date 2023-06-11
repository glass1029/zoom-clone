const socket = io();  //io function은 알아서 socket.io를 실행하고 있는 서버를 찾음

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream; //stream = video + audio
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach(camera => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if(currentCamera.label === camera.label) {
        option.selected = true;
      }
      cameraSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstraints = { //deviceId 없을 때 실행
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {  //deviceId 있을 때 실행
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints,
    );
    myFace.srcObject = myStream;
    if (!deviceId) {  //처음 한번만 실행
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()  //MediaStreamTrack의 kind에 따라 가져오는 func 수정
    .forEach((track) => (track.enabled = !track.enabled));  //track.enabled T <=> F
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()  //MediaStreamTrack의 kind에 따라 가져오는 func 수정
    .forEach((track) => (track.enabled = !track.enabled));  //track.enabled T <=> F
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(cameraSelect.value);
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// Welcome Form (choose a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
// 방을 처음 개설한 peer A에게만 실행됨
socket.on("welcome", async () => {
  const offer = await myPeerConnection.createOffer(); //다른 브라우저가 참가할 수 있도록 초대장 만드는 역할
  myPeerConnection.setLocalDescription(offer);  //생성한 offer로 연결 구성
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);  //특정 peer에게 연결 보내기
});

// 초대장을 받은 Peer B에서 실행
socket.on("offer", async(offer) => {
  myPeerConnection.setRemoteDescription(offer); //받은 offer description
  const answer = await myPeerConnection.createAnswer(); //연결된 브라우저에게 보낼 answer 생성
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

// Peer A에서 실행
socket.on("answer", answer => {
  myPeerConnection.setRemoteDescription(answer); 
});

// RTC Code
function makeConnection() {
  myPeerConnection = new RTCPeerConnection(); //각 브라우저에서 peer-to-peer 연결 만들기
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream)); //각 브라우저에 카메라와 마이크 데이터 stream을 받아서 연결 안에 넣기
}