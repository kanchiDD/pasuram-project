const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/pasuram-line-editor";

let currentGlobal = 0;
let dirty = false;

const txtGlobal = document.getElementById("global_no");
const btnLoad = document.getElementById("loadBtn");
const btnSave = document.getElementById("saveBtn");
const btnPrev = document.getElementById("prevBtn");
const btnNext = document.getElementById("nextBtn");

const lineContainer = document.getElementById("lineContainer");
const statusBar = document.getElementById("status");
const btnAddLine = document.getElementById("addLineBtn");

function setStatus(msg, color = "green") {
    statusBar.innerHTML = msg;
    statusBar.style.color = color;
}

function markDirty() {
    dirty = true;
}

// ---------------------------------------------------------------
// Helpers: card creation / behaviour attachment / renumbering
// ---------------------------------------------------------------

function getCards() {
    return Array.from(lineContainer.querySelectorAll(".line-card"));
}

function createLineCard(line) {

    const card = document.createElement("div");
    card.className = "line-card";
    card.dataset.line = line.line_no;

    card.innerHTML = `
        <div class="line-header">

            <div class="line-title">
                Line ${line.line_no}
            </div>

            <div class="group-box">

                <label>Recital Group</label>

                <input
                    type="number"
                    class="recital-group"
                    value="${line.recital_group}"
                    data-line="${line.line_no}">

            </div>

        </div>

        <textarea
            class="line-text"
            data-line="${line.line_no}"
            spellcheck="false">${line.line_text ?? ""}</textarea>

        <div class="line-buttons">
            <button type="button" class="btn-add-below">➕ Add Below</button>
            <button type="button" class="btn-split">✂ Split</button>
            <button type="button" class="btn-merge-next">⇅ Merge Next</button>
            <button type="button" class="btn-delete">🗑 Delete</button>
        </div>
    `;

    return card;

}

function attachCardBehaviors(card) {

    card
        .querySelectorAll(".line-text,.recital-group")
        .forEach(x => x.addEventListener("input", markDirty));

}

function attachTamilVisaiToCard(card) {

    if (!window.TamilVisai)
        return;

    const t = card.querySelector(".line-text");

    if (t)
        TamilVisai.attach(t, { layout: "phonetic" });

}

function renumberLines() {

    getCards().forEach((card, idx) => {

        const num = idx + 1;

        card.dataset.line = num;

        const title = card.querySelector(".line-title");
        const textarea = card.querySelector(".line-text");
        const group = card.querySelector(".recital-group");

        if (title)
            title.textContent = `Line ${num}`;

        if (textarea)
            textarea.dataset.line = num;

        if (group)
            group.dataset.line = num;

    });

}

// ---------------------------------------------------------------
// Line operations: Add / Split / Merge / Delete
// ---------------------------------------------------------------

function addLineBelow(card) {

    const groupInput = card.querySelector(".recital-group");
    const groupValue = groupInput ? groupInput.value : 1;

    const newCard = createLineCard({
        line_no: 0,
        recital_group: groupValue,
        line_text: ""
    });

    attachCardBehaviors(newCard);
    attachTamilVisaiToCard(newCard);

    card.after(newCard);

    renumberLines();
    markDirty();

    const newTextarea = newCard.querySelector(".line-text");

    if (newTextarea)
        newTextarea.focus();

}

function splitLine(card) {

    const textarea = card.querySelector(".line-text");

    if (!textarea)
        return;

    const pos = textarea.selectionStart ?? textarea.value.length;

    const before = textarea.value.slice(0, pos);
    const after = textarea.value.slice(pos);

    const groupInput = card.querySelector(".recital-group");
    const groupValue = groupInput ? groupInput.value : 1;

    textarea.value = before;

    const newCard = createLineCard({
        line_no: 0,
        recital_group: groupValue,
        line_text: after
    });

    attachCardBehaviors(newCard);
    attachTamilVisaiToCard(newCard);

    card.after(newCard);

    renumberLines();
    markDirty();

    const newTextarea = newCard.querySelector(".line-text");

    if (newTextarea) {

        newTextarea.focus();

        newTextarea.setSelectionRange(0, 0);

    }

}

function mergeNext(card) {

    const next = card.nextElementSibling;

    if (!next || !next.classList.contains("line-card")) {
        alert("Cannot merge last line.");
        return;
    }

    const textarea = card.querySelector(".line-text");
    const nextTextarea = next.querySelector(".line-text");

    if (!textarea || !nextTextarea)
        return;

    textarea.value = textarea.value + nextTextarea.value;

    next.remove();

    renumberLines();
    markDirty();

    textarea.focus();

}

function deleteLine(card) {

    const textarea = card.querySelector(".line-text");

    if (textarea && textarea.value.trim() !== "") {
        alert("Only empty lines can be deleted.");
        return;
    }

    if (getCards().length <= 1) {
        alert("Cannot delete final remaining line.");
        return;
    }

    const next = card.nextElementSibling;
    const prev = card.previousElementSibling;

    card.remove();

    renumberLines();
    markDirty();

    const focusCard =
        (next && next.classList.contains("line-card")) ? next :
        (prev && prev.classList.contains("line-card")) ? prev :
        null;

    if (focusCard) {

        const focusTextarea = focusCard.querySelector(".line-text");

        if (focusTextarea)
            focusTextarea.focus();

    }

}

function addLineAtEnd() {

    const cards = getCards();

    let groupValue = 1;

    if (cards.length) {

        const lastGroupInput = cards[cards.length - 1].querySelector(".recital-group");

        if (lastGroupInput)
            groupValue = lastGroupInput.value;

    }

    const newCard = createLineCard({
        line_no: 0,
        recital_group: groupValue,
        line_text: ""
    });

    attachCardBehaviors(newCard);
    attachTamilVisaiToCard(newCard);

    lineContainer.appendChild(newCard);

    renumberLines();
    markDirty();

    const newTextarea = newCard.querySelector(".line-text");

    if (newTextarea)
        newTextarea.focus();

}

if (btnAddLine) {

    btnAddLine.addEventListener("click", () => {

        if (currentGlobal === 0) {
            alert("Load a record first.");
            return;
        }

        addLineAtEnd();

    });

}

// Single delegated listener handles all per-card action buttons,
// so newly added/split cards work without re-binding anything.
lineContainer.addEventListener("click", function (e) {

    const card = e.target.closest(".line-card");

    if (!card)
        return;

    if (e.target.classList.contains("btn-add-below")) {
        addLineBelow(card);
    }
    else if (e.target.classList.contains("btn-split")) {
        splitLine(card);
    }
    else if (e.target.classList.contains("btn-merge-next")) {
        mergeNext(card);
    }
    else if (e.target.classList.contains("btn-delete")) {
        deleteLine(card);
    }

});

// ---------------------------------------------------------------
// Load / Save / Navigation (unchanged behaviour)
// ---------------------------------------------------------------

async function loadRecord(globalNo) {

    if (!globalNo || globalNo <= 0) {
        alert("Enter a valid Global Number.");
        txtGlobal.focus();
        return;
    }

    setStatus("Loading...", "blue");

    try {

        const response = await fetch(
            `${API}?global_no=${globalNo}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok)
            throw new Error("HTTP " + response.status);

        const data = await response.json();

        lineContainer.innerHTML = "";

        data.lines.forEach(line => {

            const card = createLineCard(line);

            lineContainer.appendChild(card);

        });

        getCards().forEach(card => {

            attachCardBehaviors(card);
            attachTamilVisaiToCard(card);

        });

        currentGlobal = globalNo;

        txtGlobal.value = currentGlobal;

        dirty = false;

        setStatus("✓ Record Loaded");

        const first = document.querySelector(".line-text");

        if (first)
            first.focus();

    }
    catch (err) {

        console.error(err);

        setStatus(err.message, "red");

        alert(err.message);

    }

}

async function saveRecord() {

    if (currentGlobal === 0) {
        alert("Load a record first.");
        return;
    }

    setStatus("Saving...", "orange");

    try {

        const lines = [];

        getCards().forEach((card, idx) => {

            const txt = card.querySelector(".line-text");
            const group = card.querySelector(".recital-group");

            lines.push({

                line_no: idx + 1,

                line_text: txt ? txt.value.trim() : "",

                recital_group: (group && parseInt(group.value)) || 1

            });

        });

        const response = await fetch(API, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                global_no: currentGlobal,

                lines: lines

            })

        });

        if (!response.ok)
            throw new Error("HTTP " + response.status);

        const result = await response.json();

        if (!result.success)
            throw new Error(result.error || "Save Failed");

        dirty = false;

        setStatus("✓ Saved Successfully");

    }
    catch (err) {

        console.error(err);

        setStatus(err.message, "red");

        alert(err.message);

    }

}

function previousRecord() {

    if (currentGlobal <= 1) {
        alert("Already first record.");
        return;
    }

    if (dirty) {
        if (!confirm("Unsaved changes.\nContinue?"))
            return;
    }

    const prev = currentGlobal - 1;

    txtGlobal.value = prev;

    loadRecord(prev);

}

function nextRecord() {

    if (dirty) {
        if (!confirm("Unsaved changes.\nContinue?"))
            return;
    }

    const next = currentGlobal + 1;

    txtGlobal.value = next;

    loadRecord(next);

}

btnLoad.addEventListener("click", () => {
    loadRecord(parseInt(txtGlobal.value));
});

btnSave.addEventListener("click", saveRecord);

btnPrev.addEventListener("click", previousRecord);

btnNext.addEventListener("click", nextRecord);

txtGlobal.addEventListener("keydown", function (e) {

    if (e.key === "Enter")
        loadRecord(parseInt(txtGlobal.value));

});

document.addEventListener("keydown", function (e) {

    if (e.ctrlKey && e.key.toLowerCase() === "s") {

        e.preventDefault();

        saveRecord();

    }

});

document.addEventListener("keydown", function (e) {

    if (e.ctrlKey && e.key === "Enter") {

        e.preventDefault();

        saveRecord();

    }

});

window.addEventListener("beforeunload", function (e) {

    if (dirty) {

        e.preventDefault();

        e.returnValue = "";

    }

});

setStatus("Ready");

txtGlobal.focus();