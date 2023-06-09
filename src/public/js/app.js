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
let myDataChannel;  //peer마다 다르게 정의

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

async function handleCameraChange() { //카메라를 변경할 때, 새로운 stream 생성
  await getMedia(cameraSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
    .getSenders() //sender는 내 peer가 아닌 다른 peer로 보내진 media stream track을 컨트롤
    .find((sender) => sender.track.kind === 'video');
    videoSender.replaceTrack(videoTrack);
  }
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
  myDataChannel = myPeerConnection.createDataChannel("chat"); //peer A가 dataChannel 생성
  myDataChannel.addEventListener("message", console.log);
  console.log("made data Channel"); //다른 peer는 만들 필요 없이 peer A만 생성
  const offer = await myPeerConnection.createOffer(); //다른 브라우저가 참가할 수 있도록 초대장 만드는 역할
  myPeerConnection.setLocalDescription(offer);  //생성한 offer로 연결 구성
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);  //특정 peer에게 연결 보내기
});

// 초대장을 받은 Peer B에서 실행
socket.on("offer", async(offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => { //peer A가 만든 dataChannel 받기
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", console.log);
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer); //받은 offer description
  const answer = await myPeerConnection.createAnswer(); //연결된 브라우저에게 보낼 answer 생성
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

// Peer A에서 실행
socket.on("answer", answer => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer); 
});

socket.on("ice", ice => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [ //stun서버: 장치에 공용주소를 알려주는 서버
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  }); //각 브라우저에서 peer-to-peer 연결 만들기
  myPeerConnection.addEventListener("icecandidate", handleIce);  // Ice candidate : 인터넷 연결 생성. WebRTCd에 필요한 프로토콜로, 멀리 떨어진 장치와 소통할 수 있게 한다. (중재 프로세스 역할)
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream)); //각 브라우저에 카메라와 마이크 데이터 stream을 받아서 연결 안에 넣기
}

function handleIce(data) {
  console.log("send candidate");
  socket.emit("ice", data.candidate, roomName); //브라우저들끼리 candidate를 서로 주고받음
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}

/*
  RTCPeerConnection.createDataChannel()
  video, audio뿐 아니라 이미지, 파일, 텍스트, 게입 업데이트 패킷 등도 주고받을 수 있음.
  socketIO 없이도 채팅을 만들 수 있음.

  webRTC의 단점
  - peer가 많은 경우 느려짐. (모든 peer에게 데이터를 보내고 받기 때문)

  SFC (Selective Forwardinf Unit)
  - 서버에 업로드하면 서버는 다른 peer에게 저사양의 stream을 제공함.
*/