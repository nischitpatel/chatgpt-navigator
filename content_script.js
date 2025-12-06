const IFRAME_ID = "gpt-sidebar-iframe";
const TOGGLE_ID = "gpt-sidebar-toggle";

// ----------------------------------------
// 1. CREATE FLOATING TOGGLE BUTTON
// ----------------------------------------
function injectToggleButton() {
    if (document.getElementById(TOGGLE_ID)) return;

    const btn = document.createElement("button");
    btn.id = TOGGLE_ID;
    btn.textContent = "Navigator";

    Object.assign(btn.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 999999999,
        padding: "10px 16px",
        borderRadius: "8px",
        background: "#1f1f1f",
        color: "white",
        border: "1px solid #444",
        cursor: "pointer"
    });

    btn.onclick = toggleSidebar;
    document.body.appendChild(btn);
}

// ----------------------------------------
// 2. CREATE SIDEBAR IFRAME
// ----------------------------------------
function injectSidebar() {
    if (document.getElementById(IFRAME_ID)) return;

    const iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.src = chrome.runtime.getURL("sidebar/sidebar.html");

    Object.assign(iframe.style, {
        position: "fixed",
        bottom: "70px",
        right: "20px",
        width: "360px",
        height: "500px",
        border: "0",
        display: "none",
        zIndex: 999999999,
        borderRadius: "12px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        background: "transparent",
        overflow: "hidden"
    });

    document.body.appendChild(iframe);
}

function toggleSidebar() {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    const showing = iframe.style.display !== "none";
    iframe.style.display = showing ? "none" : "block";

    if (!showing) {
        sendQuestionsToSidebar();
    }
}

injectToggleButton();
injectSidebar();

// ---------------------------------------------------
// 3. EXTRACT QUESTIONS FROM ChatGPT DOM
// ---------------------------------------------------
function getQuestions() {
    const nodes = document.querySelectorAll("div[data-message-id][data-message-author-role]");
    const out = [];

    nodes.forEach((node) => {
        const role = node.getAttribute("data-message-author-role");
        if (role !== "user") return;

        const text = node.innerText.trim();
        if (!text) return;

        out.push({
            id: node.getAttribute("data-message-id"),
            text
        });
    });

    return out;
}

// ---------------------------------------------------
// 4. SEND TO SIDEBAR VIA postMessage
// ---------------------------------------------------
function sendQuestionsToSidebar() {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    iframe.contentWindow.postMessage(
        { type: "questions-update", questions: getQuestions() },
        "*"
    );
}

// ---------------------------------------------------
// 5. OBSERVE DOM FOR NEW QUESTIONS
// ---------------------------------------------------
const observer = new MutationObserver(() => {
    sendQuestionsToSidebar();
});

observer.observe(document.body, { childList: true, subtree: true });

// initial load
setTimeout(sendQuestionsToSidebar, 1500);


// Receive scroll-to requests from sidebar iframe
window.addEventListener("message", (event) => {
    if (event.data?.type === "scroll-to") {
        const id = event.data.id;
        const msg = document.querySelector(`[data-message-id="${id}"]`);

        if (msg) {
            msg.scrollIntoView({ behavior: "smooth", block: "center" });

            // highlight flash
            msg.style.boxShadow = "0 0 10px 3px gold";
            setTimeout(() => msg.style.boxShadow = "", 1500);
        }
    }
});