const API = "https://pasuram-api.kanchitrust.workers.dev/api/munnadi-editor";

let currentGlobal = 0;
let dirty = false;

// =========================
// ELEMENTS
// =========================

const txtGlobal = document.getElementById("global_no");
const txtLine1 = document.getElementById("line1");
const txtLine2 = document.getElementById("line2");

const btnLoad = document.getElementById("loadBtn");
const btnSave = document.getElementById("saveBtn");
const btnPrev = document.getElementById("prevBtn");
const btnNext = document.getElementById("nextBtn");

const status = document.getElementById("status");

// =========================

function setStatus(msg, color = "green") {

    status.innerHTML = msg;
    status.style.color = color;

}

// =========================

txtLine1.addEventListener("input", () => dirty = true);
txtLine2.addEventListener("input", () => dirty = true);

txtLine1.addEventListener("keydown", function (e) {

    if (e.key === "Tab") {

        e.preventDefault();

        txtLine2.focus();

    }

});

// =========================

async function loadRecord(globalNo) {

    if (!globalNo || globalNo <= 0) {

        alert("Enter Global Number");
        return;

    }

    setStatus("Loading...", "blue");

    try {

        const url = API + "?global_no=" + globalNo;

console.log(url);

const res = await fetch(url);

        const data = await res.json();

        txtGlobal.value = globalNo;

        txtLine1.value = data.line_1 || "";
        txtLine2.value = data.line_2 || "";
	txtLine1.focus();
        currentGlobal = globalNo;
	txtGlobal.value = currentGlobal;

        dirty = false;

        setStatus("✓ Record Loaded","green");

    }

    catch (e) {

        console.log(e);

        setStatus("Load Failed", "red");

    }

}

// =========================

async function saveRecord() {

    if (currentGlobal == 0) {

        alert("Load a record first.");
        return;

    }

	setStatus("Saving...","orange");

    try {

        const res = await fetch(API, {

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

        const result = await res.json();

        if (result.success) {

            dirty = false;

            

            // Automatically move to next record

            setStatus("✓ Saved Successfully");

        }

        else {

            setStatus("❌ Save Failed","red");

        }

    }

    catch (e) {

        console.log(e);

        setStatus("Save Failed", "red");

    }

}

// =========================

function previousRecord() {

    if (dirty) {

        if (!confirm("Unsaved changes.\nContinue?"))
            return;

    }

    if (currentGlobal <= 1) {

        alert("Already First Record");
        return;

    }

    loadRecord(currentGlobal - 1);

}
// =========================

function nextRecord() {

    if (dirty) {

        if (!confirm("Unsaved changes.\nContinue?"))
            return;

    }

    loadRecord(currentGlobal + 1);

}

// =========================

btnLoad.onclick = () => {

    loadRecord(

        parseInt(txtGlobal.value)

    );

};

btnSave.onclick = saveRecord;

btnPrev.onclick = previousRecord;

btnNext.onclick = nextRecord;

// =========================

txtGlobal.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        loadRecord(

            parseInt(txtGlobal.value)

        );

    }

});

// =========================

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

// =========================

window.addEventListener("beforeunload", function (e) {

    if (dirty) {

        e.preventDefault();

        e.returnValue = "";

    }

});

// =========================

setStatus("Ready");