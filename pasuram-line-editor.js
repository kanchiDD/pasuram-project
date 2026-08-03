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

function setStatus(msg, color = "green") {
    statusBar.innerHTML = msg;
    statusBar.style.color = color;
}

function markDirty() {
    dirty = true;
}

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

            const card = document.createElement("div");
            card.className = "line-card";

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
            `;

            lineContainer.appendChild(card);

        });

        if (window.TamilVisai) {

            document
                .querySelectorAll(".line-text")
                .forEach(t => {

                    TamilVisai.attach(t, {
                        layout: "phonetic"
                    });

                });

        }

        document
            .querySelectorAll(".line-text,.recital-group")
            .forEach(x => x.addEventListener("input", markDirty));

        currentGlobal = globalNo;
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

        document
            .querySelectorAll(".line-text")
            .forEach(txt => {

                const lineNo = parseInt(txt.dataset.line);

                const group = document.querySelector(
                    `.recital-group[data-line="${lineNo}"]`
                );

                lines.push({

                    line_no: lineNo,

                    line_text: txt.value.trim(),

                    recital_group: parseInt(group.value) || 1

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

    loadRecord(currentGlobal - 1);

}

function nextRecord() {

    if (dirty) {

        if (!confirm("Unsaved changes.\nContinue?"))
            return;

    }

    loadRecord(currentGlobal + 1);

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