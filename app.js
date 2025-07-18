import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase, ref, set, push, onValue, onDisconnect, off
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyL5j7k__kQcD-gg4vUs0s1gEGivMirvQ",
  authDomain: "chat-book-2a28a.firebaseapp.com",
  databaseURL: "https://chat-book-2a28a-default-rtdb.firebaseio.com",
  projectId: "chat-book-2a28a",
  storageBucket: "chat-book-2a28a.appspot.com",
  messagingSenderId: "379483530013",
  appId: "1:379483530013:web:70486fb32ac7af3cf3f7f4",
  measurementId: "G-ZHXYV5DCNE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

const authSection = document.getElementById("auth-section");
const main = document.getElementById("main");
const logoutBtn = document.getElementById("logout-btn");
const topRow = document.getElementById("topRow");

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const toSignup = document.getElementById("to-signup");
const toLogin = document.getElementById("to-login");

const liEmail = document.getElementById("li-email");
const liPass = document.getElementById("li-password");
const suEmail = document.getElementById("su-email");
const suPass = document.getElementById("su-password");
const suUsername = document.getElementById("su-username");

const liToggle = document.getElementById("li-toggle");
const suToggle = document.getElementById("su-toggle");

const userlist = document.getElementById("userlist");
const chatScreen = document.getElementById("chat-screen");
const messagesDiv = document.getElementById("messages");
const chatWithName = document.getElementById("chat-with-name");
const backBtn = document.getElementById("back-btn");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");

let currentUser = null;
let currentChatId = null;
let selectedUser = null;

let usersRef = null;
let usersListener = null;

toSignup.onclick = () => {
  loginForm.style.display = "none";
  signupForm.style.display = "flex";
};

toLogin.onclick = () => {
  signupForm.style.display = "none";
  loginForm.style.display = "flex";
};

signupBtn.onclick = () => {
  const email = suEmail.value.trim();
  const password = suPass.value.trim();
  const username = suUsername.value.trim();

  if (!email || !password || !username) {
    alert("Fill all signup fields");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCred => {
      const uid = userCred.user.uid;
      set(ref(db, "users/" + uid), { username, email, online: true });
      suEmail.value = "";
      suPass.value = "";
      suUsername.value = "";
      alert("Signup successful");
    })
    .catch(err => alert(err.message));
};

loginBtn.onclick = () => {
  const email = liEmail.value.trim();
  const password = liPass.value.trim();

  if (!email || !password) {
    alert("Fill email and password");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      liEmail.value = "";
      liPass.value = "";
    })
    .catch(err => alert(err.message));
};

function setUserOnline(uid) {
  const userStatusRef = ref(db, "users/" + uid + "/online");
  set(userStatusRef, true);
  onDisconnect(userStatusRef).set(false);
}

function loadUsers() {
  if (usersRef && usersListener) {
    off(usersRef, "value", usersListener);
  }

  usersRef = ref(db, "users");
  usersListener = snapshot => {
    if (!currentUser) return;

    const users = snapshot.val() || {};
    userlist.innerHTML = "";

    for (const uid in users) {
      if (uid === currentUser.uid) continue;

      const user = users[uid];
      const userDiv = document.createElement("div");
      userDiv.className = "user-item";

      const dot = document.createElement("span");
      dot.className = "online-dot " + (user.online ? "online" : "offline");

      userDiv.appendChild(dot);
      userDiv.appendChild(document.createTextNode(user.username));
      userDiv.onclick = () => openChat(uid, user.username);
      userlist.appendChild(userDiv);
    }
  };

  onValue(usersRef, usersListener, err => {
    alert("Failed to load users: " + err.message);
  });
}

function openChat(uid, name) {
  selectedUser = uid;
  currentChatId = [currentUser.uid, uid].sort().join("_");
  chatWithName.textContent = name;
  chatScreen.classList.add("active");
  topRow.style.opacity = "0";
  topRow.style.pointerEvents = "none";
  logoutBtn.style.opacity = "0";
  logoutBtn.style.pointerEvents = "none";
  msgInput.disabled = false;
  sendBtn.disabled = false;
  msgInput.blur();
  loadMessages();
}

function loadMessages() {
  const chatRef = ref(db, "chats/" + currentChatId);
  onValue(chatRef, snapshot => {
    messagesDiv.innerHTML = "";
    const data = snapshot.val() || {};
    for (const key in data) {
      const msg = data[key];
      const senderId = msg.sender || "";
      const div = document.createElement("div");
      div.className = "message " + (senderId === currentUser.uid ? "from-me" : "from-other");
      div.innerHTML = `${msg.text}<div class="timestamp">${formatTime(msg.time)}</div>`;
      messagesDiv.appendChild(div);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text) return;
  const chatRef = ref(db, "chats/" + currentChatId);
  push(chatRef, {
    sender: currentUser.uid,
    text,
    time: Date.now()
  });
  msgInput.value = "";
};

backBtn.onclick = () => {
  chatScreen.classList.remove("active");
  topRow.style.opacity = "1";
  topRow.style.pointerEvents = "auto";
  logoutBtn.style.opacity = "1";
  logoutBtn.style.pointerEvents = "auto";
};

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

logoutBtn.onclick = () => {
  confirm("Are you sure you want to logout?", () => {
    if (usersRef && usersListener) {
      off(usersRef, "value", usersListener);
      usersListener = null;
      usersRef = null;
    }
    set(ref(db, "users/" + currentUser.uid + "/online"), false)
      .then(() => signOut(auth))
      .catch(err => alert("Logout error: " + err.message));
  });
};

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    setUserOnline(user.uid);
    authSection.style.display = "none";
    main.style.display = "flex";
    logoutBtn.style.display = "block";
    signupForm.style.display = "none"
    loginForm.style.display = "flex"
    loadUsers();
  } else {
    currentUser = null;
    loginForm.style.display = "flex"
    signupForm.style.display = "none"
    if (usersRef && usersListener) {
      off(usersRef, "value", usersListener);
      usersListener = null;
      usersRef = null;
    }
    authSection.style.display = "flex";
    main.style.display = "none";
    logoutBtn.style.display = "none";
    userlist.innerHTML = "";
  }
});

// Toggle password visibility
function setupToggle(inputId, toggleBtnId) {
  const input = document.getElementById(inputId);
  const toggleBtn = document.getElementById(toggleBtnId);
  toggleBtn.onclick = () => {
    if (input.type === "password") {
      input.type = "text";
      toggleBtn.innerHTML = `
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
    } else {
      input.type = "password";
      toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.38 20.38 0 0 1 5.6-7.18"/>
          <path d="M1 1l22 22"/>
        </svg>
      `;
    }
  };
}

setupToggle("li-password", "li-toggle");
setupToggle("su-password", "su-toggle");

// Custom dialog functions

const overlay = document.getElementById("overlay");
const dialog = document.getElementById("dialogBox");
const dialogMsg = document.getElementById("dialogMsg");
const promptInput = document.getElementById("promptInput");
const cancelBtn = document.getElementById("cancelBtnD");
const okBtn = document.getElementById("okBtn");

let currentDialogType = "alert";
let okCallback = null;
let cancelCallback = null;

function openDialog(type, msg, okFn, cancelFn) {
  currentDialogType = type;
  okCallback = okFn || (() => {});
  cancelCallback = cancelFn || closeDialog;

  dialogMsg.textContent = msg;
  promptInput.style.display = type === "prompt" ? "block" : "none";
  promptInput.value = "";

  cancelBtn.style.display = type === "alert" ? "none" : "inline-block";

  overlay.classList.add("shown");
  dialog.classList.add("shown");
  disableScroll();

  if (type === "prompt") setTimeout(() => promptInput.focus(), 100);
}

function closeDialog() {
  overlay.classList.remove("shown");
  dialog.classList.remove("shown");
  enableScroll();
}

cancelBtn.onclick = () => {
  closeDialog();
  if (currentDialogType !== "alert") cancelCallback();
};

okBtn.onclick = () => {
  closeDialog();
  if (currentDialogType === "prompt") okCallback(promptInput.value);
  else okCallback();
};

window.alert = (msg, ok) => openDialog("alert", msg, ok);
window.confirm = (msg, ok, cancel) => openDialog("confirm", msg, ok, cancel);
window.prompt = (msg, ok, cancel) => openDialog("prompt", msg, ok, cancel);

function disableScroll() {
  document.body.addEventListener("touchmove", preventScroll, { passive: false });
}

function preventScroll(e) {
  e.preventDefault();
}

function enableScroll() {
  document.body.removeEventListener("touchmove", preventScroll, { passive: false });
}