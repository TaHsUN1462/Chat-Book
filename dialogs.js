document.addEventListener("DOMContentLoaded", ()=>{
  (function () {
    const __UID = "DX_" + Math.random().toString(36).slice(2);

    let _config = {
        okButtonText: "OK",
        cancelButtonText: "Cancel",
        inputPlaceholder: "",
        dialogBackgroundColor: "#fff",
        msgTextColor: "#3c3c4399",
        buttonTextColor: "#007aff",
        buttonBackgroundColor: "#fff",
        buttonHoverBackgroundColor: "#eee",
        dialogWidth: "280px",
        dialogBorderRadius: "14px",
        fontSize: "15px",
        buttonFontSize: "17px",
        dialogScale: 0.95,
        autoFocusInput: true,
        autoCapitalizeInput: false,
        promptInputType: "text",
        alertTakeCallback: false
    };

    const styleEl = document.createElement("style");
    document.head.appendChild(styleEl);

    const overlay = document.createElement("div");
    overlay.className = __UID + "_overlay";

    const dialog = document.createElement("div");
    dialog.className = __UID + "_dialog";

    const messageEl = document.createElement("p");
    const inputEl = document.createElement("input");
    const buttonRow = document.createElement("div");
    buttonRow.className = __UID + "_buttons";

    const okBtn = document.createElement("button");
    const cancelBtn = document.createElement("button");
    buttonRow.append(cancelBtn, okBtn);
    dialog.append(messageEl, inputEl, buttonRow);
    overlay.append(dialog);
    document.body.appendChild(overlay);

    let type = "alert",
        okCallback = () => {},
        cancelCallback = () => {};
    let currentOverride = {};

    const applyStyles = cfg => {
        const c = cfg || _config;
        styleEl.textContent = `
  .${__UID}_dialog{
    position:fixed;
    top:50%;left:50%;
    width:${c.dialogWidth};
    background:${c.dialogBackgroundColor};
    border-radius:${c.dialogBorderRadius};
    transform:translate(-50%,-50%) scale(0.95); /* always start smaller */
    opacity:1;
    pointer-events:none;
    z-index:9999999999999999999999999;
    display:flex;
    flex-direction:column;
    text-align:center;
    transition:transform 200ms ease, opacity 200ms ease;
    box-sizing:border-box;
    overflow: hidden;
  }
  .${__UID}_dialog.shown{
    transform:translate(-50%,-50%) scale(${c.dialogScale}); /* final size */
    opacity:1;
    pointer-events:auto;
  }
  .${__UID}_dialog p{
    margin:20px 10px 10px;
    font-size:${c.fontSize};
    color:${c.msgTextColor};
    white-space:pre-wrap;
  }
  .${__UID}_dialog input{
    display:none;
    width:85%;
    margin:0 auto 10px;
    padding:10px;
    font-size:${c.fontSize};
    border:1px solid #ccc;
    border-radius:10px;
    outline:none;
    background: ${c.buttonBackgroundColor};
    color:${c.buttonTextColor};
  }
  .${__UID}_buttons{
    display:flex;
    border-top:1px solid #ccc;
    margin:0;
  }
  .${__UID}_buttons button{
    flex:1;
    font-size:${c.buttonFontSize};
    font-weight:600;
    padding:12px 0;
    background:${c.buttonBackgroundColor};
    color:${c.buttonTextColor};
    border:none;
    border-radius:0;
    transition:0.2s;
  }
  .${__UID}_buttons button:first-child{
    border-right:1px solid #ccc;
  }
  .${__UID}_buttons button:hover{
    background:${c.buttonHoverBackgroundColor};
  }
  .${__UID}_overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.5);
    z-index:9999999999999999999999998;
    opacity:0;
    pointer-events:none;
    transition:opacity 100ms ease;
  }
  .${__UID}_overlay.shown{
    opacity:1;
    pointer-events:auto;
  }
`;
    };

    const open = (t, message, okCb, cancelCb, override = {}) => {
        type = t;
        okCallback = okCb || (() => {});
        cancelCallback = cancelCb || (() => {});
        currentOverride = override;
        const cfg = { ..._config, ...override };
        applyStyles(cfg);

        messageEl.innerHTML = message;
        okBtn.textContent = cfg.okButtonText;
        cancelBtn.textContent = cfg.cancelButtonText;
        inputEl.style.display = t === "prompt" ? "block" : "none";
        inputEl.placeholder = cfg.inputPlaceholder;
        inputEl.type = cfg.promptInputType;
        inputEl.value = "";
        cancelBtn.style.display = t === "alert" ? "none" : "inline-block";
        inputEl.autocapitalize = cfg.autoCapitalizeInput ? "on" : "off";

        overlay.classList.add("shown");
        dialog.classList.add("shown");
        if (t === "prompt" && cfg.autoFocusInput)
            setTimeout(() => inputEl.focus(), 50);
    };

    const close = () => {
        overlay.classList.remove("shown");
        dialog.classList.remove("shown");
    };

    okBtn.onclick = () => {
        close();
        const cfg = { ..._config, ...currentOverride };
        if (type === "alert") {
            if (cfg.alertTakeCallback) okCallback();
        } else {
            okCallback(type === "prompt" ? inputEl.value : undefined);
        }
    };
    cancelBtn.onclick = () => {
        close();
        if (type !== "alert") cancelCallback();
    };

    window.Dialogs = {
        initialize(cfg = {}) {
            Object.assign(_config, cfg);
            applyStyles();
        },
        openAlert: (msg, okCb, override) =>
            open("alert", msg, okCb, null, override),
        openConfirm: (msg, okCb, cancelCb, override) =>
            open("confirm", msg, okCb, cancelCb, override),
        openPrompt: (msg, okCb, cancelCb, override) =>
            open("prompt", msg, okCb, cancelCb, override),

        help: function () {
            console.log(`
Dialogs.js Features:

1️⃣ Global Configuration via Dialogs.initialize(dialogConfig)
   - okButtonText, cancelButtonText
   - inputPlaceholder
   - dialogBackgroundColor, buttonTextColor, buttonBackgroundColor, buttonHoverBackgroundColor
   - dialogWidth, dialogBorderRadius
   - fontSize, buttonFontSize
   - dialogScale, roundButtons
   - autoFocusInput, autoCapitalizeInput, promptInputType
   - alertTakeCallback

2️⃣ Supports alert, confirm, prompt with callbacks

3️⃣ Per-call override

4️⃣ Cancel callback works for confirm & prompt

5️⃣ Fully responsive & modern styling

🔥 Default config:

const dialogConfig = {
  okButtonText: "ঠিক আছে",
  cancelButtonText: "বাতিল করুন",
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
`);
        },
        getConfig: function () {
            let text = `const dialogConfig = {
  okButtonText: "ঠিক আছে",
  cancelButtonText: "বাতিল করুন",
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
Dialogs.initialize(dialogConfig);`
navigator.clipboard.writeText(text)
        }
    };

    window.alert = (msg, okCb, override) =>
        Dialogs.openAlert(msg, okCb, override);
    window.confirm = (msg, okCb, cancelCb, override) =>
        Dialogs.openConfirm(msg, okCb, cancelCb, override);
    window.prompt = (msg, okCb, cancelCb, override) =>
        Dialogs.openPrompt(msg, okCb, cancelCb, override);
})();
})