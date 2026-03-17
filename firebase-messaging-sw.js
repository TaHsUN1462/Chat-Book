importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyAyL5j7k__kQcD-gg4vUs0s1gEGivMirvQ",
  authDomain: "chat-book-2a28a.firebaseapp.com",
  projectId: "chat-book-2a28a",
  storageBucket: "chat-book-2a28a.appspot.com",
  messagingSenderId: "379483530013",
  appId: "1:379483530013:web:70486fb32ac7af3cf3f7f4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/WhatsUp/app-icon.png'
  });
});