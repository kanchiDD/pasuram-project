const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/munnadi-editor";

let currentGlobal = 0;
let dirty = false;

//--------------------------------------------------
// ELEMENTS
//--------------------------------------------------

const txtGlobal = document.getElementById("global_no");
const txtLine1 = document.getElementById("line1");
const txtLine2 = document.getElementById("line2");

const btnLoad = document.getElementById("loadBtn");
const btnSave = document.getElementById("saveBtn");
const btnPrev = document.getElementById("prevBtn");
const btnNext = document.getElementById("nextBtn");

const statusBar = document.getElementById("status");

//--------------------------------------------------

function setStatus(msg, color = "green") {
    statusBar.innerHTML = msg;
    statusBar.style.color = color;
}

//--------------------------------------------------

function markDirty() {
    dirty = true;
}

txtLine1.addEventListener("input", markDirty);
txtLine2.addEventListener("input", markDirty);

//--------------------------------------------------

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

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {

            const text = await response.text();

            console.error(text);

            throw new Error(
                "Worker returned HTML instead of JSON."
            );
        }

        const data = await response.json();

        txtGlobal.value = globalNo;

        txtLine1.value = data.line_1 || "";
        txtLine2.value = data.line_2 || "";

        currentGlobal = globalNo;

        dirty = false;

        txtLine1.focus();

        setStatus("✓ Record Loaded");

    } catch (err) {

        console.error(err);

        setStatus(err.message, "red");

        alert(err.message);

    }

}

//--------------------------------------------------

async function saveRecord() {

    if (currentGlobal === 0) {
        alert("Load a record first.");
        return;
    }

    setStatus("Saving...", "orange");

    try {

        const response = await fetch(API, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                global_no: currentGlobal,

                line_1: txtLine1.value.trim(),

                line_2: txtLine2.value.trim()

            })

        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || "Save Failed");
        }

        dirty = false;

        setStatus("✓ Saved Successfully");

        txtLine1.focus();

    } catch (err) {

        console.error(err);

        setStatus(err.message, "red");

        alert(err.message);

    }

}

//--------------------------------------------------

function previousRecord() {

    if (currentGlobal <= 1) {

        alert("Already first record.");

        return;

    }

    if (dirty) {

        if (!confirm("Unsaved changes.\nContinue?")) {

            return;

        }

    }

    loadRecord(currentGlobal - 1);

}

//--------------------------------------------------

function nextRecord() {

    if (dirty) {

        if (!confirm("Unsaved changes.\nContinue?")) {

            return;

        }

    }

    loadRecord(currentGlobal + 1);

}

//--------------------------------------------------

btnLoad.addEventListener("click", () => {

    loadRecord(parseInt(txtGlobal.value));

});

btnSave.addEventListener("click", saveRecord);

btnPrev.addEventListener("click", previousRecord);

btnNext.addEventListener("click", nextRecord);

//--------------------------------------------------

txtGlobal.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        loadRecord(parseInt(txtGlobal.value));

    }

});

//--------------------------------------------------

document.addEventListener("keydown", function (e) {

    if (e.ctrlKey && e.key.toLowerCase() === "s") {

        e.preventDefault();

        saveRecord();

    }

});

//--------------------------------------------------

document.addEventListener("keydown", function (e) {

    if (e.ctrlKey && e.key === "Enter") {

        e.preventDefault();

        saveRecord();

    }

});

//--------------------------------------------------

window.addEventListener("beforeunload", function (e) {

    if (dirty) {

        e.preventDefault();

        e.returnValue = "";

    }

});

//--------------------------------------------------

setStatus("Ready");

txtGlobal.focus();