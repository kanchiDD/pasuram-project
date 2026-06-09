async function loadVedam() {

    try {

        const response = await fetch(
            "https://cdnaalayiram-api.kanchitrust.workers.dev/api/vedam"
        );

        if (!response.ok) {
            throw new Error("API Error: " + response.status);
        }

        const rows = await response.json();

        const grouped = {};

        rows.forEach(row => {

            if (!grouped[row.veda_id]) {

                grouped[row.veda_id] = {
                    name: row.veda_name,
                    items: []
                };

            }

            if (row.audio_id) {
                grouped[row.veda_id].items.push(row);
            }

        });

        let html = "";

        Object.keys(grouped).forEach(id => {

            const veda = grouped[id];

            html += `
                <div class="veda-card">

                    <div class="veda-header"
                         onclick="toggleVedam(${id})">

                        ▶ ${veda.name}

                    </div>

                    <div class="audio-list"
                         id="veda-${id}">
            `;

            veda.items.forEach(audio => {

    let sequence = audio.title.replace(/[A-Za-z]/g, "");
    sequence = parseInt(sequence, 10);

    let displayTitle =
        `${audio.veda_name} - ${sequence}`;

    html += `
        <div class="audio-row"
             onclick="playAudio(
               '${audio.audio_url}',
               '${displayTitle}'
             )">

            🎧 ${displayTitle}

        </div>
    `;

});

            html += `
                    </div>

                </div>
            `;

        });

        document.getElementById("vedaContainer").innerHTML = html;

    }
    catch (err) {

        console.error(err);

        document.getElementById("vedaContainer").innerHTML =
            "Unable to load Vedam";

    }

}

function toggleVedam(id) {

    const div = document.getElementById("veda-" + id);

    div.style.display =
        div.style.display === "block"
        ? "none"
        : "block";

}

function playAudio(url, title) {

    document.getElementById("vedaContainer").style.display = "none";

    document.getElementById("playerContainer").innerHTML = `

    <div class="audio-player">

        <div class="player-nav">

    <button class="back-button"
            onclick="backToVedam()">
        ← Back to Vedam
    </button>

    <button class="home-button"
            onclick="goHome()">
        🏠 Home
    </button>

</div>

        <h3>${title}</h3>

        <audio controls autoplay style="width:100%;">
            <source src="${url}" type="audio/mpeg">
        </audio>

    </div>

`;
}

function backToVedam() {

    document.getElementById("playerContainer").innerHTML = "";

    document.getElementById("vedaContainer").style.display = "block";

}

document.addEventListener(
    "DOMContentLoaded",
    loadVedam
);

function goHome() {

    window.location.href = "tree.html";

}