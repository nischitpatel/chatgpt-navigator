console.log("Sidebar loaded");

let allQuestions = [];

// Receive questions from content_script
window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.type === "questions-update") {
        allQuestions = event.data.questions || [];
        renderQuestions();
    }
});

// Render list of questions
function renderQuestions(filter = "") {
    const list = document.getElementById("questions-list");
    list.innerHTML = "";

    const filtered = allQuestions.filter(q =>
        q.text.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        list.innerHTML = "<div style='padding:12px;color:#999'>No questions yet</div>";
        return;
    }

    filtered.forEach((q) => {
        // const div = document.createElement("div");
        // div.className = "question-item";
        // div.textContent = q.text;

        // div.onclick = () => {
        //     window.parent.postMessage(
        //         { type: "scroll-to", id: q.id },
        //         "*"
        //     );
        // };
        const div = document.createElement("div");
        div.className = "question-item";

        const inner = document.createElement("div");
        inner.className = "question-text";
        inner.textContent = q.text;

        div.appendChild(inner);

        div.onclick = () => {
            const msg = document.querySelector(`[data-nav-id="${q.questionId}"]`);
            if (msg) {
                msg.scrollIntoView({ behavior: "smooth", block: "center" });
                msg.style.boxShadow = "0 0 10px 3px gold";
                setTimeout(() => (msg.style.boxShadow = ""), 1500);
            }
        };

        list.appendChild(div);
    });
}

document.getElementById("search").oninput = (e) => {
    renderQuestions(e.target.value);
};

document.getElementById("refresh").onclick = () => {
    renderQuestions();
};
