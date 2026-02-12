import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    set,
    push,
    onValue,
    onDisconnect,
    off,
    update,
    remove,
    query,
    limitToLast,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    deleteUser,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
let userIdSaved = JSON.parse(localStorage.getItem("userIdSaved")) || [];
let updateCode = "12-02-2026-02:40";
let hasUpdated = localStorage.getItem(updateCode) || "true";
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

let currentUser = null,
    currentUsername = null;
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
    let hidden = email.replace(/(.{3}).+(@.+)/, "$1.....$2");
    showLoading("Logging in " + hidden + " ...");
    createUserWithEmailAndPassword(auth, email, password)
        .then(userCred => {
            const uid = userCred.user.uid;
            let avatar = generateColor();
            set(ref(db, "users/" + uid), {
                username,
                password,
                email,
                online: true,
                avatar,
                lastLoginTime: Date.now() // Store as timestamp for math
            });
            userIdSaved.push({ email: suEmail.value, pass: suPass.value });
            save();
            suEmail.value = "";
            suPass.value = "";
            suUsername.value = "";
            changeAuth();
            alert("Signup successful");
        })
        .catch(err => {
            alert(err.message);
            closeLoading();
        });
};
loginBtn.onclick = () => {
    const email = liEmail.value.trim();
    const password = liPass.value.trim();

    if (!email || !password) {
        alert("Fill email and password");
        return;
    }
    let hidden = email.replace(/(.{3}).+(@.+)/, "$1.....$2");
    showLoading("Logging in " + hidden + " ...");

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            userIdSaved.push({ email: liEmail.value, pass: liPass.value });
            save();
            liEmail.value = "";
            liPass.value = "";

            changeAuth();
        })
        .catch(err => {
            alert(err.message);
            closeLoading();
        });
};
function changeAuth() {
    onAuthStateChanged(auth, user => {
        if (user) {
            if (typeof Android !== "undefined") Android.startServer(user.uid);
            update(ref(db, "users/" + user.uid), { lastLoginTime: Date.now() });
            currentUser = user;
            get(ref(db, "users/" + user.uid)).then(snapshot => {
                let currentData = snapshot.val();
                currentUsername = currentData.username;
                let toChangeSavedId = userIdSaved.find(
                    l => l.email === currentUser.email
                );
                toChangeSavedId.username = currentData.username;
                toChangeSavedId.avatar = currentData.avatar;
                save();
                displaySaves();
                // closeLoading();
            });
            setUserOnline(user.uid);
            authSection.style.display = "none";
            main.style.display = "flex";
            menuBtn.style.display = "flex";
            signupForm.style.display = "none";
            loginForm.style.display = "flex";
            document.querySelector("#settings-btn").classList.add("needSpace");
            showLoading("Loading your contacts");
            loadUsers();
            displaySaves();
            addVideoCallListener();
        } else {
            (currentUser = null), (currentUsername = null);
            document
                .querySelector("#settings-btn")
                .classList.remove("needSpace");
            loginForm.style.display = "flex";
            signupForm.style.display = "none";
            if (usersRef && usersListener) {
                off(usersRef, "value", usersListener);
                usersListener = null;
                usersRef = null;
            }
            authSection.style.display = "flex";
            main.style.display = "none";
            menuBtn.style.display = "none";
            userlist.innerHTML = "";
            closeLoading();
        }
    });
}
function setUserOnline(uid) {
    const userStatusRef = ref(db, "users/" + uid + "/online");
    set(userStatusRef, true);
    onDisconnect(userStatusRef).set(false);
}

function removeContact(uid) {
    confirm("Remove this person from your list? 🚮", () => {
        remove(ref(db, `users/${currentUser.uid}/contacts/${uid}`));
    });
}


function loadUsers() {
    if (usersRef && usersListener) off(usersRef, "value", usersListener);
    usersRef = ref(db, "users");
    usersListener = snapshot => {
        if (!currentUser) return;
        const users = snapshot.val() || {};
        const myData = users[currentUser.uid] || {};
        const myContacts = myData.contacts || {};
        userlist.innerHTML = "";
        const reg = /<[^>]*>/g;
        document.querySelector(".myavatar").innerHTML =
            myData.username?.replace(reg, "")[0] || "";
        document
            .querySelector(".myavatar")
            .style.setProperty("--avatar-bg", myData.avatar);
        document.querySelector(".myname").innerHTML = myData.username;

        const myIdDisplay = document.querySelector(".my-id-display");
        myIdDisplay.innerHTML = `Unique ID: ${currentUser.uid.slice(-6)}`;
        myIdDisplay.onclick = () =>
            navigator.clipboard.writeText(`${currentUser.uid.slice(-6)}`);

        // FIX: Compare as Numbers and use B - A for descending order! 📈
        const sortedIds = Object.keys(myContacts).sort((a, b) => {
            const valA = Number(myContacts[a].lastTs) || 0;
            const valB = Number(myContacts[b].lastTs) || 0;
            return valB - valA;
        });
        sortedIds.forEach(uid => {
            const user = users[uid];
            if (!user) return;
            const userDiv = document.createElement("div");
            userDiv.className = "user-item";

            const badge = myContacts[uid].unread
                ? `<span class="badge"></span>`
                : "";
            const avatarChar = user.username.replace(reg, "")[0];

            userDiv.innerHTML = `
        <div class="user-avatar" style="--avatar-bg: ${
            user.avatar
        }">${avatarChar}</div>
        <div>${user.username} ${badge}</div>
        <span class="online-dot ${user.online ? "online" : "offline"}"></span>
      `;

            userDiv.onclick = () => {
                if (myContacts[uid].unread)
                    update(
                        ref(db, `users/${currentUser.uid}/contacts/${uid}`),
                        { unread: false }
                    );
                openChat(uid, user.username);
            };

            userDiv.onmousedown = () =>
                (holdTimer = setTimeout(() => removeContact(uid), 1000));
            userDiv.onmouseup = () => clearTimeout(holdTimer);
            userDiv.ontouchstart = () =>
                (holdTimer = setTimeout(() => removeContact(uid), 1000));
            userDiv.ontouchend = () => clearTimeout(holdTimer);
            userDiv.ontouchmove = () => clearTimeout(holdTimer);
            userlist.appendChild(userDiv);
        });
        closeLoading();
    };
    onValue(usersRef, usersListener);
}

function openChat(uid, name) {
    selectedUser = uid;
    currentChatId = [currentUser.uid, uid].sort().join("_");

    // Get the user data to see their last login
    get(ref(db, "users/" + uid)).then(snapshot => {
        const userData = snapshot.val();
        const statusText = userData.online
            ? "Online"
            : `Last active: ${getRelativeTime(userData.lastLoginTime)}`;
        chatWithName.innerHTML = `<div>${name}</div><small style="font-size:12px; opacity:0.8;">${statusText}</small>`;
    });

    // ... rest of your existing code
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

let renderTimeout, holdTimer;

function loadMessages() {
    const chatRef = ref(db, "chats/" + currentChatId);
    off(chatRef);

    onValue(chatRef, snapshot => {
        // Clear existing timer to prevent double-renders
        clearTimeout(renderTimeout);

        renderTimeout = setTimeout(() => {
            const data = snapshot.val() || {};
            messagesDiv.innerHTML = "";

            const msgs = Object.entries(data)
                .map(([key, val]) => ({ key, ...val }))
                .sort((a, b) => a.time - b.time);

            let lastDate = "";
            msgs.forEach(msg => {
                const isMe = msg.sender === currentUser.uid;

                if (!isMe && !msg.seen) {
                    update(ref(db, `chats/${currentChatId}/${msg.key}`), {
                        seen: true
                    });
                }

                const dateStr = new Date(msg.time).toLocaleDateString("en-GB");
                if (dateStr !== lastDate) {
                    const dateDiv = document.createElement("div");
                    dateDiv.className =
                        "date-separator" + (isMe ? " mine-date-separator" : "");
                    dateDiv.textContent = dateStr;
                    messagesDiv.appendChild(dateDiv);
                    lastDate = dateStr;
                }

                const div = document.createElement("div");
                div.className = "message " + (isMe ? "from-me" : "from-other");
                const tickClass = msg.seen ? "status-seen" : "status-sent";
                const ticks = isMe
                    ? `<svg class="tick-icon ${tickClass}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" height="1.5em" width="1.5em"><path fill="currentColor" d="M18.9 35.1q-.3 0-.55-.1-.25-.1-.5-.35L8.8 25.6q-.45-.45-.45-1.1 0-.65.45-1.1.45-.45 1.05-.45.6 0 1.05.45l8 8 18.15-18.15q.45-.45 1.075-.45t1.075.45q.45.45.45 1.075T39.2 15.4L19.95 34.65q-.25.25-.5.35-.25.1-.55.1Z"/></svg>`
                    : "";

                div.innerHTML = `${msg.text}<div class="timestamp">${formatTime(
                    msg.time
                )}${ticks}</div>`;
                div.ontouchstart = () =>
                    (holdTimer = setTimeout(() => handleHold(msg.key), 1000));
                div.ontouchend = () => clearTimeout(holdTimer);
                div.ontouchmove = () => clearTimeout(holdTimer); // Resets if you scroll!
                div.onmousedown = () =>
                    (holdTimer = setTimeout(() => handleHold(msg.key), 1000));
                div.onmouseup = () => clearTimeout(holdTimer);

                messagesDiv.appendChild(div);
            });

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 50); // 50ms is the "sweet spot" to stop loops 🍬
    });
}

function handleHold(msgKey) {
    confirm("Delete this message for everyone? 🗑️", () => {
        remove(ref(db, `chats/${currentChatId}/${msgKey}`));
    });
}

sendBtn.onclick = async () => {
    const text = msgInput.value.trim();
    if (!text || !selectedUser) return;

    const ts = Date.now();

    await push(ref(db, `chats/${currentChatId}`), {
        sender: currentUser.uid,
        text,
        time: ts
    });

    // Update YOU (lastTs moves them up)
    update(ref(db, `users/${currentUser.uid}/contacts/${selectedUser}`), {
        lastTs: ts
    });

    // Update THEM (lastTs moves you up + badge)
    update(ref(db, `users/${selectedUser}/contacts/${currentUser.uid}`), {
        lastTs: ts,
        unread: true
    });

    msgInput.value = "";
};

backBtn.onclick = () => {
    closeChat();
};
function closeChat() {
    update(ref(db, `users/${currentUser.uid}/contacts/${selectedUser}`), {
        unread: false
    });
    chatScreen.classList.remove("active");
    topRow.style.opacity = "1";
    topRow.style.pointerEvents = "auto";
    logoutBtn.style.opacity = "1";
    logoutBtn.style.pointerEvents = "auto";
}
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
                if (typeof Android !== "undefined") Android.onLogout();
                signOut(auth);
                displaySaves();
                currentUsername = null;
                document.querySelector(".menu").classList.remove("shown");
                authForm.style.display = "none";
                document.querySelector(".usersSaved").style.display = "flex";
                window.location.reload();
            })
            .catch(err => alert("Logout error: " + err.message));
    });
};
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

function save() {
    localStorage.setItem("userIdSaved", JSON.stringify(userIdSaved));
}
const authForm = document.getElementById("auth-form");
function displaySaves() {
    if (userIdSaved.length > 0) {
        authForm.style.display = "none";
        document.querySelector(".users").innerHTML = "";
        userIdSaved.forEach((item, index) => {
            let row = document.createElement("div");
            row.className = "saved-id-row";
            if (item.username) {
                let reg = new RegExp("<[^>]*>", "g");
                let usernameAvatar = item.username.replace(reg, "")[0];
                row.innerHTML = `
     <div class="id-avatar" style="--avatar-bg:${item.avatar}">${usernameAvatar}</div>
      <div class="id-name">${item.username}</div>
    `;
            } else {
                row.innerHTML = `
     <div class="id-avatar" style="--avatar-bg:${item.avatar}">${item.username}</div>
      <div class="id-name">${item.username}</div>
    `;
            }
            let deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = `
                <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" height="1.5em" width="1.5em"><path fill="currentColor" d="M24 26.1 13.5 36.6q-.45.45-1.05.45-.6 0-1.05-.45-.45-.45-.45-1.05 0-.6.45-1.05L21.9 24 11.4 13.5q-.45-.45-.45-1.05 0-.6.45-1.05.45-.45 1.05-.45.6 0 1.05.45L24 21.9l10.5-10.5q.45-.45 1.05-.45.6 0 1.05.45.45.45.45 1.05 0 .6-.45 1.05L26.1 24l10.5 10.5q.45.45.45 1.05 0 .6-.45 1.05-.45.45-1.05.45-.6 0-1.05-.45Z"/></svg>
    `;
            deleteBtn.onclick = event => {
                deleteIdFromSaved(event, index);
            };
            row.appendChild(deleteBtn);
            row.onclick = () => {
                showLoading("Loading account <b>" + item.username + "<b> ...");
                signInWithEmailAndPassword(auth, item.email, item.pass)
                    .then(() => {
                        changeAuth();
                        closeLoading();
                    })
                    .catch(err => {
                        alert(err.message);
                        closeLoading();
                    });
            };
            document.querySelector(".users").appendChild(row);
        });
    } else {
        authForm.style.display = "flex";
        document.querySelector(".usersSaved").style.display = "none";
        document.querySelector(".users").innerHTML =
            "No accounts saved try logging in directly first!";
    }
}
document.getElementById("useAnother").addEventListener("click", () => {
    authForm.style.display = "flex";
    document.querySelector(".usersSaved").style.display = "none";
});
document.querySelectorAll("#useSaved").forEach(el =>
    el.addEventListener("click", () => {
        authForm.style.display = "none";
        document.querySelector(".usersSaved").style.display = "flex";
    })
);

function deleteIdFromSaved(e, index) {
    e.stopPropagation();
    confirm("Are you sure you want to remove this from saved accounts?", () => {
        userIdSaved.splice(index, 1);
        displaySaves();
        save();
    });
}
function generateColor() {
    let r = Math.floor(Math.random() * 255);
    let g = Math.floor(Math.random() * 255);
    let b = Math.floor(Math.random() * 255);
    return `rgb(${r},${g},${b})`;
}
displaySaves();

const passwordChangeBtn = document.getElementById("change-password-btn");
const passwordSubmitBtn = document.getElementById("changePasswordSubmit");
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
        let usertochange = userIdSaved.find(
            u => u.username === currentUsername
        );
        usertochange.pass = newPassword;
        save();
        alert("Password updated successfully!");
    } catch (err) {
        alert(err.message);
    }
});

menuBtn.addEventListener("click", () => {
    document.querySelector(".menu").classList.add("shown");
    document.querySelector(".overlay").classList.add("shown");
});
document.querySelector(".closeMenu").addEventListener("click", () => {
    document.querySelector(".menu").classList.remove("shown");
    document.querySelector(".overlay").classList.remove("shown");
});
function showLoading(msg) {
    document.querySelector(".loader").classList.add("shown");
    document.querySelector(".loader .text").innerHTML = `${msg}`;
    document.querySelector(".loaderbar").style.animation =
        "showLoading 500ms ease-out forwards";
}
function closeLoading() {
    document.querySelector(".loaderbar").style.animation =
        "completeLoading 500ms ease-out forwards";
    setTimeout(() => {
        document.querySelector(".loader").classList.remove("shown");
    }, 400);
}
document.getElementById("change-username-btn").addEventListener("click", () => {
    document.querySelector(".usernameChange").classList.add("shown");
    document.querySelector(".overlay").classList.add("shown");
    document.querySelector(".menu").classList.remove("shown");
    document.getElementById("currentUsernameInput").value = currentUsername;
});
passwordChangeBtn.addEventListener("click", () => {
    document.querySelector(".passwordChange").classList.add("shown");
    document.querySelector(".overlay").classList.add("shown");
    document.querySelector(".menu").classList.remove("shown");
});
document.getElementById("delete-account-btn").addEventListener("click", () => {
    confirm(
        "Are you sure you want to delete this account?\nNo data can be recovered again!",
        () => {
            confirm("Delete?", () => {
                remove(ref(db, "users/" + currentUser.uid));
                deleteUser(currentUser);
                currentUsername = null;
                signOut(auth);
                document.querySelector(".menu").classList.remove("shown");
                alert("Account deleted successfully", () =>
                    window.location.reload()
                );
            });
        }
    );
});
document.querySelector(".closeUsernameChange").addEventListener("click", () => {
    document.querySelector(".usernameChange").classList.remove("shown");
    document.querySelector(".overlay").classList.remove("shown");
    document.querySelector(".menu").classList.remove("shown");
    document.getElementById("currentUsernameInput").value = "";
});
document.querySelector(".closePasswordChange").addEventListener("click", () => {
    document.querySelector(".passwordChange").classList.remove("shown");
    document.querySelector(".overlay").classList.remove("shown");
    document.querySelector(".menu").classList.remove("shown");
    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("newPasswordC").value = "";
});
document.getElementById("changeUsernameSubmit").onclick = async () => {
    const snap = await get(ref(db, "users"));
    let users = snap.val() || {};
    let newUsername = document
        .getElementById("currentUsernameInput")
        .value.trim();
    // let findUser = users.find(i=> i.username === newUsername);
    let ok = !Object.values(users).some(u => u.username === newUsername);
    if (!ok) {
        alert("Same username exist", () => {
            document.querySelector(".overlay").classList.add("shown");
        });
    } else {
        let uniqueid = currentUser.uid;
        update(ref(db, "users/" + uniqueid), { username: newUsername });
        let toChangeSavedId = userIdSaved.find(
            l => l.email === currentUser.email
        );
        toChangeSavedId.username = newUsername;
        save();
        displaySaves();
        currentUsername = newUsername;
        alert("Username change successful", () => {
            document.querySelector(".usernameChange").classList.remove("shown");
            document.querySelector(".overlay").classList.remove("shown");
            document.querySelector(".menu").classList.remove("shown");
            document.getElementById("currentUsernameInput").value = "";
        });
    }
};

function checkLoading(callback) {
    if (document.readyState !== "complete") {
        showLoading("Wait while its loading");
        document.addEventListener("readystatechange", () => {
            if (document.readyState === "complete") callback();
        });
    } else {
        callback();
    }
}

checkLoading(() => {
    if (hasUpdated == "true") {
        alert(`UI has been updated at \n${updateCode}`, () =>
            localStorage.setItem(updateCode, "false")
        );
    }
    if (!navigator.onLine) {
        alert("You are offline", () => {
            document.body.style.display = "none";
        });
    }
    window.addEventListener("offline", () => {
        alert("You are offline", () => {
            document.body.style.display = "none";
        });
    });
    window.addEventListener("online", () => {
        alert("You are back online");
        document.body.style.display = "block";
    });
    showLoading("Checking login state...");
    setTimeout(() => {
        changeAuth();
    }, 500);
});
function notify() {
    onAuthStateChanged(auth, user => {
        if (!user) return;
        onValue(ref(db, "chats"), snapshot => {
            snapshot.forEach(child => {
                const chatId = child.key;
                if (chatId.includes(user.uid)) {
                    const q = query(ref(db, `chats/${chatId}`), limitToLast(1));
                    onValue(q, snap => {
                        if (!snap.exists()) return;
                        const msgId = Object.keys(snap.val())[0];
                        const msg = snap.val()[msgId];

                        if (
                            msg.sender !== user.uid &&
                            !localStorage.getItem(`warn_${msgId}`)
                        ) {
                            // Inside your notify() onValue listener
                            // Add them to your contacts automatically so they show up!
                            update(
                                ref(
                                    db,
                                    `users/${user.uid}/contacts/${msg.sender}`
                                ),
                                {
                                    lastTs: msg.time,
                                    // Don't set unread: true here if you want to handle that in the sender logic instead,
                                    // but adding it here ensures they see the red dot even if the app was closed!
                                    unread: true
                                }
                            );

                            // Fetch sender's name from the users node
                            get(ref(db, `users/${msg.sender}`)).then(uSnap => {
                                const name = uSnap.exists()
                                    ? uSnap.val().username
                                    : "Someone";
                                // Strip HTML tags if your username field contains them
                                const cleanName = name.replace(/<[^>]*>/g, "");

                                // notification(cleanName, msg.text);
                                localStorage.setItem(`warn_${msgId}`, "true");
                            });
                        }
                    });
                }
            });
        });
    });
}
function notification(title, msg) {
    if (typeof Android !== "undefined") {
        Android.sendNotify(title, msg);
    }
}
notify();
function getRelativeTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);

    if (mins < 60) return `${mins} minutes ago`;
    if (hrs < 24) return `${hrs} hours ago`;
    return formatTime(ts) + " " + new Date(ts).toLocaleDateString("en-GB");
}
async function searchAndAdd(shortId) {
    const snap = await get(ref(db, "users"));
    const users = snap.val() || {};
    const targetUid = Object.keys(users).find(id => id.slice(-6) === shortId);

    if (!targetUid) {
        return alert("Nobody found with that ID!️");
    }

    if (targetUid === currentUser.uid) {
        return alert("You can't add yourself");
    }

    await set(ref(db, `users/${currentUser.uid}/contacts/${targetUid}`), true);
    alert("User added to your list!");
    document.getElementById("searchedUsers").innerHTML = "";
}

document.querySelector(".search").onclick = () => {
    document.querySelector(".searchingArea").classList.add("shown");
    document.getElementById("search").focus();
};
document.addEventListener("DOMContentLoaded", () => {
    const dialogConfig = {
        okButtonText: "OK",
        cancelButtonText: "Cancel",
        inputPlaceholder: "",
        msgTextColor: "#3c3c4399",
        dialogBackgroundColor: "#fff",
        buttonTextColor: "#007aff",
        buttonBackgroundColor: "#fff",
        buttonHoverBackgroundColor: "#eee",
        dialogWidth: "300px",
        dialogBorderRadius: "15px",
        fontSize: "15px",
        buttonFontSize: "17px",
        dialogScale: 1,
        autoFocusInput: false,
        autoCapitalizeInput: false,
        promptInputType: "text",
        alertTakeCallback: true
    };
    Dialogs.initialize(dialogConfig);
});
async function searchUser(query) {
    const searchContainer = document.getElementById("searchedUsers");
    searchContainer.innerHTML = "";
    if (!query.trim()) return;

    const snap = await get(ref(db, "users"));
    const users = snap.val() || {};
    const q = query.toLowerCase();

    const matches = Object.keys(users).filter(id => {
        const isMe = id === currentUser.uid;
        const shortId = id.slice(-6).toLowerCase();
        const nameMatch = users[id].username.toLowerCase().startsWith(q);
        const idMatch = shortId.startsWith(q); // Now ID also supports partial typing!

        return !isMe && (nameMatch || idMatch);
    });

    if (matches.length === 0) {
        searchContainer.innerHTML = "";
        return;
    }

    matches.forEach(uid => {
        const user = users[uid];
        const div = document.createElement("div");
        div.className = "searchedUser";
        const cleanName = user.username.replace(/<[^>]*>/g, "");
        const shortId = uid.slice(-6);

        div.innerHTML = `
      <div class="user-avatar" style="--avatar-bg:${user.avatar}">${cleanName[0]}</div>
      <div>${cleanName} <span style="font-size:0.7em; opacity:0.6">#${shortId}</span></div>
    `;

        div.onclick = () => {
            searchAndAdd(shortId);
            closeSearch();
            searchContainer.innerHTML = "";
        };
        searchContainer.appendChild(div);
    });
}

document.getElementById("search").oninput = () => {
    let q = document.getElementById("search").value.trim();
    searchUser(q);
    if (q.length > 0) {
        document.querySelector(".clearIcon").classList.add("shown");
    } else {
        document.querySelector(".clearIcon").classList.remove("shown");
    }
};
document.querySelector(".clearIcon").onclick = () => {
    document.getElementById("search").value = "";
    document.getElementById("searchedUsers").innerHTML = "";
};
document.querySelector(".backIcon").onclick = () => {
    closeSearch();
};
function closeSearch() {
    document.querySelector(".searchingArea").classList.remove("shown");
    document.getElementById("searchedUsers").innerHTML = "";
    document.getElementById("search").value = "";
}
export function checkOpens() {
    let chatShown = document
        .getElementById("chat-screen")
        .classList.contains("active");
    let menuShown = document.querySelector(".menu").classList.contains("shown");
    if (chatShown) {
        closeChat();
    } else if (menuShown) {
        document.querySelector(".menu").classList.remove("shown");
        document.querySelector(".overlay").classList.remove("shown");
    } else {
        confirm("Do you want to close app", () => {
            CloseInterface.closeApp();
        });
    }
}
window.checkOpens = checkOpens;

// video calling
const constraints = {
    audio: { 
        echoCancellation: true, 
        noiseSuppression: true, 
        autoGainControl: true 
    },
    video: { 
        width: { ideal: 640 }, // Lower resolution helps audio priority
        frameRate: { max: 24 } // Cap FPS to save bandwidth
    }
};

const videoCallBtn = document.getElementById('video-call-btn');
const declineVideoCallBtn = document.getElementById('decline-video-call');
const videoCallScreen = document.getElementById('video-call-screen');
const localVideoScreen = document.getElementById('local-video-screen');
const remoteVideoScreen = document.getElementById('remote-video-screen');

let peerConnection;

videoCallBtn.onclick = () => showVideoCallScreen();
declineVideoCallBtn.onclick = () => endCallGlobally();

function showVideoCallScreen() {
    if (typeof closeChat === 'function') closeChat();
    videoCallScreen.classList.add("shown");
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localVideoScreen.srcObject = stream;
            localVideoScreen.play();
            startCalling();
        });
}

function endCallGlobally() {
    if (selectedUser) remove(ref(db, `calls/${selectedUser}`));
    if (currentUser) remove(ref(db, `calls/${currentUser.uid}`));
    videoCallScreen.classList.remove("shown");
    if (localVideoScreen.srcObject) localVideoScreen.srcObject.getTracks().forEach(t => t.stop());
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}

async function startCalling() {
    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnection.candQueue = []; // Queue for race conditions

    const stream = localVideoScreen.srcObject;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    
    peerConnection.ontrack = (e) => {
        remoteVideoScreen.srcObject = e.streams[0];
        remoteVideoScreen.play();
    };

    peerConnection.onicecandidate = (e) => {
        if (e.candidate) push(ref(db, `calls/${selectedUser}/callerCandidates`), e.candidate.toJSON());
    };

    // FIX: Queue candidates if Answer hasn't arrived yet!
    onChildAdded(ref(db, `calls/${selectedUser}/receiverCandidates`), (snap) => {
        if (!snap.exists()) return;
        const cand = new RTCIceCandidate(snap.val());
        if (peerConnection.remoteDescription) {
            peerConnection.addIceCandidate(cand);
        } else {
            peerConnection.candQueue.push(cand);
        }
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await set(ref(db, `calls/${selectedUser}`), { 
        offer: JSON.stringify(offer), 
        from: currentUser.uid 
    });

    onValue(ref(db, `calls/${selectedUser}`), async (snap) => {
        const data = snap.val();
        if (!data) return endCallGlobally();
        if (data.answer && peerConnection.signalingState !== "stable") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
            // Flush queued candidates
            peerConnection.candQueue.forEach(c => peerConnection.addIceCandidate(c));
            peerConnection.candQueue = [];
        }
    });
}

function addVideoCallListener() {
    onValue(ref(db, `calls/${currentUser.uid}`), (snap) => {
        const data = snap.val();
        if (data && data.offer && !data.answer) showIncomingVideoCall(data);
        if (!data && videoCallScreen.classList.contains("shown")) endCallGlobally();
    });
}

function showIncomingVideoCall(data) {
    selectedUser = data.from;
    document.querySelector('.incomingVideoCallUI').classList.add("shown");
    get(ref(db, `/users/${selectedUser}`)).then(snap => {
        let u = snap.val();
        document.getElementById('videoCallerName').innerHTML = u.username;
        document.getElementById('videoCallerAvatar').innerHTML = u.username[0];
        document.getElementById('videoCallerAvatar').style.background = u.avatar;
    });

    document.getElementById('video-answer-btn').onclick = () => {
        document.querySelector('.incomingVideoCallUI').classList.remove("shown");
        answerIncomingVideoCall(data);
    };
    document.getElementById('video-decline-btn').onclick = () => {
        document.querySelector('.incomingVideoCallUI').classList.remove("shown");
        endCallGlobally();
    };
}

async function answerIncomingVideoCall(data) {
    videoCallScreen.classList.add("shown");
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (localVideoScreen.srcObject !== stream) {
        localVideoScreen.srcObject = stream;
        localVideoScreen.play().catch(e => console.log("Play interrupted"));
    }
    
    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnection.candQueue = []; 

    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = (e) => {
        remoteVideoScreen.srcObject = e.streams[0];
        remoteVideoScreen.play();
    };

    peerConnection.onicecandidate = (e) => {
        if (e.candidate) push(ref(db, `calls/${currentUser.uid}/receiverCandidates`), e.candidate.toJSON());
    };

    onChildAdded(ref(db, `calls/${currentUser.uid}/callerCandidates`), (snap) => {
        if (!snap.exists()) return;
        const cand = new RTCIceCandidate(snap.val());
        if (peerConnection.remoteDescription) {
            peerConnection.addIceCandidate(cand);
        } else {
            peerConnection.candQueue.push(cand);
        }
    });

    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
    
    // Flush queued candidates
    peerConnection.candQueue.forEach(cand => peerConnection.addIceCandidate(cand));
    peerConnection.candQueue = [];

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await set(ref(db, `calls/${currentUser.uid}`), { 
        ...data, 
        answer: JSON.stringify(answer) 
    });
}
