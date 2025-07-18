import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, onDisconnect, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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

const authSection = document.getElementById('auth-section');
const main = document.getElementById('main');
const logoutBtn = document.getElementById('logout-btn');
const topRow = document.getElementById('topRow');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const toSignup = document.getElementById('to-signup');
const toLogin = document.getElementById('to-login');

const liEmail = document.getElementById('li-email');
const liPass = document.getElementById('li-password');
const suEmail = document.getElementById('su-email');
const suPass = document.getElementById('su-password');
const suUsername = document.getElementById('su-username');

const userlist = document.getElementById('userlist');
const chatScreen = document.getElementById('chat-screen');
const messagesDiv = document.getElementById('messages');
const chatWithName = document.getElementById('chat-with-name');
const backBtn = document.getElementById('back-btn');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

let currentUser = null;
let currentChatId = null;
let selectedUser = null;

toSignup.onclick = () => {
  loginForm.style.display = "none";
  signupForm.style.display = "flex";
};

toLogin.onclick = () => {
  signupForm.style.display = "none";
  loginForm.style.display = "flex";
};

signupBtn.onclick = () => {
  const email = suEmail.value;
  const password = suPass.value;
  const username = suUsername.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCred => {
      const uid = userCred.user.uid;
      set(ref(db, 'users/' + uid), { username, email, online: true });
      suEmail.value = "";
      suPass.value = "";
      suUsername.value = "";
    })
    .catch(err => alert(err.message));
};

loginBtn.onclick = () => {
  const email = liEmail.value;
  const password = liPass.value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      liEmail.value = "";
      liPass.value = "";
    })
    .catch(err => alert(err.message));
};

function setUserOnline(uid) {
  const userStatusRef = ref(db, 'users/' + uid + '/online');
  set(userStatusRef, true);
  onDisconnect(userStatusRef).set(false);
}

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    setUserOnline(user.uid);
    authSection.style.display = "none";
    main.style.display = "flex";
    logoutBtn.style.display = "block";

    // ✅ Authenticated now, safe to read
    loadUsers();
  } else {
    currentUser = null;
    authSection.style.display = "flex";
    main.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

logoutBtn.onclick = () => {
  if (confirm("Are you sure you want to logout?")) {
    set(ref(db, 'users/' + currentUser.uid + '/online'), false)
      .then(() => signOut(auth));
  }
};

function loadUsers() {
  onValue(ref(db, "users"), snapshot => {
    console.log("🔥 Users fetched");
    const users = snapshot.val();
    console.log("Fetched users:", users);
    userlist.innerHTML = "";

    if (!users) {
      alert("No users found in DB");
      return;
    }

    for (let uid in users) {
      console.log("Checking UID:", uid);
      console.log("Current user UID:", currentUser?.uid);

      if (uid === currentUser?.uid) {
        console.log("Skipping current user");
        continue;
      }

      const div = document.createElement("div");
      div.className = "user-item";

      const dot = document.createElement("span");
      dot.className = "online-dot";
      dot.classList.add(users[uid].online ? "online" : "offline");

      div.appendChild(dot);
      div.appendChild(document.createTextNode(users[uid].username));
      div.onclick = () => openChat(uid, users[uid].username);
      userlist.appendChild(div);
    }
  }, err => {
    console.error("❌ Failed to load users:", err);
  });
}

function openChat(uid, name) {
  selectedUser = uid;
  currentChatId = [currentUser.uid, uid].sort().join("_");
  chatWithName.textContent = name;
  chatScreen.classList.add("active");
  topRow.style.opacity = '0';
  topRow.style.pointerEvents = 'none';
  logoutBtn.style.opacity = '0';
  logoutBtn.style.pointerEvents = 'none';
  msgInput.disabled = false;
  sendBtn.disabled = false;
  msgInput.blur(); // prevent auto focus
  loadMessages();
}

function loadMessages() {
  onValue(ref(db, "chats/" + currentChatId), snapshot => {
    messagesDiv.innerHTML = "";
    const data = snapshot.val() || {};
    for (let key in data) {
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
  topRow.style.opacity = '1';
  topRow.style.pointerEvents = 'auto';
  logoutBtn.style.opacity = '1';
  logoutBtn.style.pointerEvents = 'auto';
};

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}