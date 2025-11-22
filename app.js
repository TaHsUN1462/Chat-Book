import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase, ref, get, set, push, onValue, onDisconnect, off, update, remove
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, sendPasswordResetEmail, deleteUser, updatePassword, EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
let userIdSaved = JSON.parse(localStorage.getItem("userIdSaved")) || [];

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
const menuBtn = document.getElementById("menu-btn");
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

let currentUser = null, currentUsername = null;
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
      let avatar = generateColor()
      set(ref(db, "users/" + uid), { username,password, email, online: true, avatar });
      userIdSaved.push({email: suEmail.value, pass: suPass.value})
      save()
      suEmail.value = "";
      suPass.value = "";
      suUsername.value = "";
      changeAuth();
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
      userIdSaved.push({email: liEmail.value, pass: liPass.value})
      save()
      liEmail.value = "";
      liPass.value = "";
      changeAuth();
    })
    .catch(err => alert(err.message));
};
function changeAuth(){
  onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    setUserOnline(user.uid);
    authSection.style.display = "none";
    main.style.display = "flex";
    menuBtn.style.display = "flex";
    signupForm.style.display = "none"
    loginForm.style.display = "flex"
    loadUsers();
    displaySaves();
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
    menuBtn.style.display = "none";
    userlist.innerHTML = "";
  }
});
}
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
      if (uid === currentUser.uid) {
        let userToEdit = userIdSaved.find(i=>i.email == users[uid].email)
        userToEdit.username = users[uid].username
        userToEdit.avatar = users[uid].avatar
        document.querySelector('.myavatar').innerHTML = users[uid].username[0];
        document.querySelector('.myavatar').style.background = users[uid].avatar;
        document.querySelector('.myname').innerHTML = users[uid].username;
        currentUsername = users[uid].username;
        save()
        // userToEdit.username = users[uid].username
      }else{
      
      const user = users[uid];
      const userDiv = document.createElement("div");
      const userAvatarDiv = document.createElement("div");
      userDiv.className = "user-item";
      userAvatarDiv.className = "user-avatar";
      userAvatarDiv.innerHTML = user.username[0];
      userAvatarDiv.style.setProperty("--avatar-bg", user.avatar);
      const dot = document.createElement("span");
      dot.className = "online-dot " + (user.online ? "online" : "offline");

      userDiv.appendChild(userAvatarDiv);
      userDiv.appendChild(document.createTextNode(user.username));
      userDiv.appendChild(dot);
      userDiv.onclick = () => openChat(uid, user.username);
      userlist.appendChild(userDiv);
    }
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
    const today = new Date().toLocaleDateString("en-GB");

    const msgs = Object.values(data).sort((a, b) =>
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    let lastDate = "";
    msgs.forEach(msg => {
      const senderId = msg.sender || "";
      const msgDate = new Date(msg.time);
      const dateStr = msgDate.toLocaleDateString("en-GB");

      if (dateStr !== lastDate) {
        const dateDiv = document.createElement("div");
        dateDiv.className = "date-separator" + (senderId === currentUser.uid ? " mine-date-separator" : "");
        dateDiv.textContent = dateStr;
        messagesDiv.appendChild(dateDiv);
        lastDate = dateStr;
      }

      const div = document.createElement("div");
      div.className = "message " + (senderId === currentUser.uid ? "from-me" : "from-other");
      div.innerHTML = `${msg.text}<div class="timestamp">${formatTime(msg.time)}</div>`;
      messagesDiv.appendChild(div);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text) return alert("No message to send!");
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
      .then(() => {
        signOut(auth)
        console.log(userIdSaved);
        displaySaves()
        currentUsername = null;
        document.querySelector('.menu').classList.remove("shown");
        authForm.style.display = "none";
        document.querySelector('.usersSaved').style.display = "flex";
      })
      .catch(err => alert("Logout error: " + err.message));
  });
};
signOut(auth)
// onAuthStateChanged(auth, user => {
//   if (user) {
//     currentUser = user;
//     setUserOnline(user.uid);
//     authSection.style.display = "none";
//     main.style.display = "flex";
//     logoutBtn.style.display = "flex";
//     signupForm.style.display = "none"
//     loginForm.style.display = "flex"
//     loadUsers();
//   } else {
//     currentUser = null;
//     loginForm.style.display = "flex"
//     signupForm.style.display = "none"
//     if (usersRef && usersListener) {
//       off(usersRef, "value", usersListener);
//       usersListener = null;
//       usersRef = null;
//     }
//     authSection.style.display = "flex";
//     main.style.display = "none";
//     logoutBtn.style.display = "none";
//     userlist.innerHTML = "";
//   }
// });

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

function save(){
  localStorage.setItem("userIdSaved", JSON.stringify(userIdSaved))
}
const authForm = document.getElementById('auth-form');
function displaySaves(){
  if(userIdSaved.length > 0){
    console.log(userIdSaved);
    authForm.style.display = "none";
    document.querySelector('.users').innerHTML = "";
  userIdSaved.forEach((item, index) => {
    let row = document.createElement("div");
    row.className = "saved-id-row";
    if(item.username){
    row.innerHTML = `
     <div class="id-avatar" style="--avatar-bg:${item.avatar}">${item.username.charAt(0)}</div>
      <div class="id-name">${item.username}</div>
    `;
    }else{
      row.innerHTML = `
     <div class="id-avatar" style="--avatar-bg:${item.avatar}">${item.username}</div>
      <div class="id-name">${item.username}</div>
    `;
    }
    let deleteBtn = document.createElement("button")
    deleteBtn.innerHTML = `
                <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" height="1.5em" width="1.5em"><path fill="currentColor" d="M24 26.1 13.5 36.6q-.45.45-1.05.45-.6 0-1.05-.45-.45-.45-.45-1.05 0-.6.45-1.05L21.9 24 11.4 13.5q-.45-.45-.45-1.05 0-.6.45-1.05.45-.45 1.05-.45.6 0 1.05.45L24 21.9l10.5-10.5q.45-.45 1.05-.45.6 0 1.05.45.45.45.45 1.05 0 .6-.45 1.05L26.1 24l10.5 10.5q.45.45.45 1.05 0 .6-.45 1.05-.45.45-1.05.45-.6 0-1.05-.45Z"/></svg>
    `
    deleteBtn.onclick = (event) => {
      deleteIdFromSaved(event, index)
    }
    row.appendChild(deleteBtn)
    row.onclick = () => {
      showLoading(item.username)
      signInWithEmailAndPassword(auth, item.email, item.pass)
    .then(() => {
      changeAuth()
      closeLoading()
    })
    .catch(err => {
      alert(err.message)
      closeLoading()
    });
    }
    document.querySelector('.users').appendChild(row);
  });
  }else{
    authForm.style.display = "flex";
  document.querySelector('.usersSaved').style.display = "none";
  document.querySelector('.users').innerHTML = "No accounts saved try logging in directly first!";
  }
}
document.getElementById('useAnother').addEventListener("click", ()=>{
  authForm.style.display = "flex";
  document.querySelector('.usersSaved').style.display = "none";
})
document.querySelectorAll('#useSaved').forEach(el=>
el.addEventListener("click", ()=>{
  authForm.style.display = "none";
  document.querySelector('.usersSaved').style.display = "flex";
}))

function deleteIdFromSaved(e, index){
  e.stopPropagation()
  confirm("Are you sure you want to remove this from saved accounts?", ()=>{
    userIdSaved.splice(index, 1);
    displaySaves();
    save();
  })
}
function generateColor(){
  let r = Math.floor(Math.random() * 255);
  let g = Math.floor(Math.random() * 255);
  let b = Math.floor(Math.random() * 255);
  return `rgb(${r},${g},${b})`
}
displaySaves();

const passwordChangeBtn = document.getElementById('change-password-btn');
const passwordSubmitBtn = document.getElementById('changePasswordSubmit');
passwordSubmitBtn.addEventListener("click", async () => {
  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const newPasswordC = document.getElementById("newPasswordC").value;
  const user = auth.currentUser;

  if (!user) return alert("You are not logged in!");

  if (newPassword !== newPasswordC) return alert("Passwords do not match!");
  
  const credential = EmailAuthProvider.credential(user.email, oldPassword);

  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    let usertochange = userIdSaved.find(u=> u.username === currentUsername)
    usertochange.pass = newPassword;
    save();
    alert("Password updated successfully!");
  } catch (err) {
    alert(err.message);
  }
});

menuBtn.addEventListener("click", ()=>{
  document.querySelector('.menu').classList.add("shown");
  document.querySelector('.overlay').classList.add("shown");
})
document.querySelector('.closeMenu').addEventListener("click", ()=>{
  document.querySelector('.menu').classList.remove("shown");
  document.querySelector('.overlay').classList.remove("shown");
})
function showLoading(username){
  document.querySelector('.loader').classList.add("shown");
  document.querySelector('.loader .text').innerHTML = `Loading account <b>${username}<b> ...`
  document.querySelector('.loaderbar').style.animation = "showLoading 500ms ease-out forwards"
}
function closeLoading(){
  document.querySelector('.loaderbar').style.animation = "completeLoading 500ms ease-out forwards"
  setTimeout(() => {
    document.querySelector('.loader').classList.remove("shown");
  }, 400);
}
document.getElementById('change-username-btn').addEventListener("click", ()=>{
  document.querySelector('.usernameChange').classList.add("shown");
  document.querySelector('.overlay').classList.add("shown");
  document.querySelector('.menu').classList.remove("shown");
  document.getElementById('currentUsernameInput').value = currentUsername;
});
passwordChangeBtn.addEventListener("click", ()=>{
  document.querySelector('.passwordChange').classList.add("shown");
  document.querySelector('.overlay').classList.add("shown");
  document.querySelector('.menu').classList.remove("shown");
});
document.getElementById('delete-account-btn').addEventListener("click", ()=>{
  confirm("Are you sure you want to delete this account?\nNo data can be recovered again!",()=>{
    confirm("Delete?", ()=>{
      remove(ref(db, "users/"+currentUser.uid))
      deleteUser(currentUser)
        currentUsername = null;
        document.querySelector('.menu').classList.remove("shown");
        alert("Account deleted successfully")
    })
  })
});
document.querySelector('.closeUsernameChange').addEventListener("click", ()=>{
  document.querySelector('.usernameChange').classList.remove("shown");
  document.querySelector('.overlay').classList.remove("shown");
  document.querySelector('.menu').classList.remove("shown");
  document.getElementById('currentUsernameInput').value = "";
});
document.querySelector('.closePasswordChange').addEventListener("click", ()=>{
  document.querySelector('.passwordChange').classList.remove("shown");
  document.querySelector('.overlay').classList.remove("shown");
  document.querySelector('.menu').classList.remove("shown");
  document.getElementById('oldPassword').value = "";
  document.getElementById('newPassword').value = "";
  document.getElementById('newPasswordC').value = "";
});
document.getElementById('changeUsernameSubmit').onclick = async() =>{
  const snap = await get(ref(db, "users"));
  let users = snap.val() || {};
  let newUsername = document.getElementById('currentUsernameInput').value.trim();
  // let findUser = users.find(i=> i.username === newUsername);
  let ok = !Object.values(users).some(u=> u.username === newUsername)
  if(!ok){
  alert("Same username exist", ()=>{
    document.querySelector('.overlay').classList.add("shown");
  })
  }else{
    let uniqueid = currentUser.uid;
    console.log(uniqueid);
    update(ref(db, "users/" + uniqueid), { username: newUsername })
    alert("Username change successful", ()=>{
      document.querySelector('.usernameChange').classList.remove("shown");
  document.querySelector('.overlay').classList.remove("shown");
  document.querySelector('.menu').classList.remove("shown");
  document.getElementById('currentUsernameInput').value = "";
    })
  }
};