import { renderReportView } from "./reportView.js";

renderReportView(document.body);

const reportToggle = document.getElementById("reportToggle");
const reportPanel = document.getElementById("reportPanel");
const closeReport = document.getElementById("closeReport");

const reportForm = document.getElementById("reportForm");

const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("addressSuggestions");
const announcementCities = document.getElementById("announcementCities");
const announcementMessages = document.getElementById("announcementMessages");
const announcementStatus = document.getElementById("announcementStatus");

const TEST_MODE = false;

const MESSAGES_URL = "http://127.0.0.1:8000/messages";

const mockAnnouncements = [
    {
        id: "mock-announcement-1",
        city: "Eindhoven",
        msg: "Demo emergency message 1."
    },
    {
        id: "mock-announcement-2",
        city: "Eindhoven",
        msg: "Demo emergency message 2."
    },
    {
        id: "mock-announcement-3",
        city: "Tilburg",
        msg: "Demo emergency message 1."
    }
];

let publishedAnnouncements = [];
let selectedAnnouncementCity = "";


document.addEventListener("DOMContentLoaded", function () {
    loadAnnouncements();
});


async function loadAnnouncements() {
    setAnnouncementStatus("Loading announcements...");

    try {
        publishedAnnouncements = TEST_MODE
            ? mockAnnouncements
            : await getAnnouncementJson(MESSAGES_URL);

        console.log("Published announcements:", publishedAnnouncements);
        renderAnnouncementCities(publishedAnnouncements);

        if (publishedAnnouncements.length === 0) {
            selectedAnnouncementCity = "";
            announcementMessages.replaceChildren();
            setAnnouncementStatus("There are currently no published announcements.");
        } else {
            setAnnouncementStatus("Select a city to read its announcements.");
        }
    } catch (error) {
        console.error("Could not load announcements:", error);
        announcementCities.replaceChildren();
        announcementMessages.replaceChildren();
        setAnnouncementStatus("Announcements could not be loaded. Please try again later.", true);
    }
}


function renderAnnouncementCities(messages) {
    announcementCities.replaceChildren();

    const uniqueCities = [];
    const seenCities = new Set();

    messages.forEach(function (message) {
        const cityKey = normaliseAnnouncementCity(message.city);

        if (!seenCities.has(cityKey)) {
            seenCities.add(cityKey);
            uniqueCities.push(message.city.trim());
        }
    });

    uniqueCities.sort(function (firstCity, secondCity) {
        return firstCity.localeCompare(secondCity, "nl-NL");
    });

    uniqueCities.forEach(function (city) {
        const cityButton = document.createElement("button");
        cityButton.type = "button";
        cityButton.className = "announcement-city-button";
        cityButton.textContent = city;
        cityButton.dataset.city = city;
        cityButton.setAttribute("aria-pressed", "false");
        cityButton.addEventListener("click", function () {
            selectAnnouncementCity(city);
        });

        announcementCities.appendChild(cityButton);
    });
}


function selectAnnouncementCity(city) {
    selectedAnnouncementCity = city;

    announcementCities.querySelectorAll(".announcement-city-button").forEach(function (button) {
        const isSelected = normaliseAnnouncementCity(button.dataset.city) ===
            normaliseAnnouncementCity(city);
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    const cityMessages = publishedAnnouncements.filter(function (message) {
        return normaliseAnnouncementCity(message.city) === normaliseAnnouncementCity(city);
    });

    renderAnnouncementMessages(city, cityMessages);
    setAnnouncementStatus(`${cityMessages.length} ${cityMessages.length === 1 ? "announcement" : "announcements"} for ${city}.`);

    console.log(`Announcements for ${city}:`, cityMessages);
}


function renderAnnouncementMessages(city, messages) {
    announcementMessages.replaceChildren();

    messages.forEach(function (message) {
        const card = document.createElement("article");
        const heading = document.createElement("h2");
        const text = document.createElement("p");

        card.className = "announcement-card";
        heading.textContent = city;
        text.textContent = message.msg;
        card.append(heading, text);
        announcementMessages.appendChild(card);
    });
}


async function getAnnouncementJson(url) {
    const response = await fetch(url);
    const responseBody = await response.json().catch(function () {
        return null;
    });

    if (!response.ok) {
        throw new Error("Announcement request failed");
    }

    return responseBody || [];
}


function normaliseAnnouncementCity(city) {
    return city.trim().toLocaleLowerCase("nl-NL");
}


function setAnnouncementStatus(message, isError = false) {
    announcementStatus.textContent = message;
    announcementStatus.classList.toggle("error", isError);
}


/*
--------------------------------------------------
REPORT PANEL
--------------------------------------------------
*/

reportToggle.addEventListener("click", function () {
    reportPanel.classList.toggle("open");
});


closeReport.addEventListener("click", function () {
    reportPanel.classList.remove("open");
});


/*
--------------------------------------------------
ADDRESS AUTOCOMPLETE
--------------------------------------------------
*/

const PDOK_SUGGEST_URL =
    "https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest";

let selectedAddress = "";
let autocompleteTimer;
let autocompleteController;


/*
We wait a short moment after typing before calling
the API. This prevents an API call for every
single key press.
*/

addressInput.addEventListener("input", function () {

    clearTimeout(autocompleteTimer);

    selectedAddress = "";

    const text = addressInput.value.trim();


    if (text.length < 3) {
        hideSuggestions();
        return;
    }


    autocompleteTimer = setTimeout(function () {
        searchAddress(text);
    }, 300);

});


async function searchAddress(text) {

    if (autocompleteController) {
        autocompleteController.abort();
    }

    autocompleteController = new AbortController();

    console.log("PDOK address search query:", text);

    try {

        const parameters = new URLSearchParams({
            q: text,
            rows: "5",
            fq: "type:adres",
            fl: [
                "weergavenaam",
                "type",
                "straatnaam",
                "huisnummer",
                "huisletter",
                "huisnummertoevoeging",
                "postcode",
                "woonplaatsnaam"
            ].join(","),
            wt: "json"
        });

        const url = `${PDOK_SUGGEST_URL}?${parameters.toString()}`;


        const response = await fetch(url, {
            signal: autocompleteController.signal
        });


        if (!response.ok) {
            throw new Error("Address lookup failed");
        }


        const data = await response.json();

        const results = data.response?.docs || [];

        console.log("PDOK address response:", data);
        console.log("PDOK address results:", results);

        if (results.length === 0) {
            console.log("No PDOK address suggestions found for:", text);
        }

        showSuggestions(results);

    }

    catch (error) {

        if (error.name === "AbortError") {
            return;
        }

        console.error("PDOK address autocomplete error:", error);

        hideSuggestions();

    }

}


/*
--------------------------------------------------
SHOW ADDRESS RESULTS
--------------------------------------------------
*/

function showSuggestions(results) {

    suggestionsBox.innerHTML = "";


    if (results.length === 0) {
        hideSuggestions();
        return;
    }


    results.forEach(function (result) {

        /*
        We require enough information for the
        backend format:

        street + house number, city
        */

        if (
            result.type !== "adres" ||
            !result.straatnaam ||
            !result.huisnummer ||
            !result.woonplaatsnaam
        ) {
            return;
        }


        const houseNumber = [
            result.huisnummer,
            result.huisletter,
            result.huisnummertoevoeging
        ].filter(Boolean).join("");

        const storedAddress =
            `${result.straatnaam} ${houseNumber}, ${result.woonplaatsnaam}`;

        const displayAddress = result.weergavenaam || [
            `${result.straatnaam} ${houseNumber}`,
            result.postcode,
            result.woonplaatsnaam
        ].filter(Boolean).join(", ");


        const suggestion = document.createElement("div");

        suggestion.className = "address-suggestion";


        suggestion.innerHTML = `
            <span class="address-main">
                ${escapeHTML(displayAddress)}
            </span>

            <span class="address-secondary">
                ${escapeHTML(result.postcode || result.woonplaatsnaam)}
            </span>
        `;


        suggestion.addEventListener("click", function () {

            addressInput.value = storedAddress;

            selectedAddress = storedAddress;

            console.log("Selected formatted address:", selectedAddress);

            hideSuggestions();

        });


        suggestionsBox.appendChild(suggestion);

    });


    if (suggestionsBox.children.length > 0) {
        suggestionsBox.classList.add("visible");
    } else {
        hideSuggestions();
    }

}


/*
--------------------------------------------------
HIDE ADDRESS RESULTS
--------------------------------------------------
*/

function hideSuggestions() {

    suggestionsBox.classList.remove("visible");

    suggestionsBox.innerHTML = "";

}


/*
Close the suggestions when clicking elsewhere.
*/

document.addEventListener("click", function (event) {

    if (
        !addressInput.contains(event.target) &&
        !suggestionsBox.contains(event.target)
    ) {

        hideSuggestions();

    }

});


/*
--------------------------------------------------
FORM SUBMISSION
--------------------------------------------------
*/

reportForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    /*
    Important:

    We only accept an address selected from
    the suggestion list.

    If the user types something manually after
    selecting an address, selectedAddress becomes
    empty again.
    */

    if (!selectedAddress) {

        alert("Please select an address from the suggestions.");

        addressInput.focus();

        return;
    }


    const formData = new FormData(reportForm);


    const floodLevelScores = {
        low: 1,
        medium: 2,
        high: 3
    };

    const waterMovementScores = {
        still: 1,
        moving_slowly: 2,
        moving_quickly: 3
    };

    const roadConditionScores = {
        passable: 1,
        difficult: 2,
        impassable: 3
    };


    const report = {

        phone: formData.get("phone").trim() || "N/A",

        address: selectedAddress,

        flood_level: floodLevelScores[formData.get("floodLevel")],

        water_movement: waterMovementScores[formData.get("waterMovement")],

        road_condition: roadConditionScores[formData.get("roadCondition")]

    };


    console.log("Submitted report request:", report);


    if (TEST_MODE) {
        alert("Frontend test successful");
        return;
    }


    try {

        const response = await fetch("http://127.0.0.1:8000/reports", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(report)
        });


        const responseBody = await response.json().catch(function () {
            return null;
        });

        console.log("Backend response:", {
            status: response.status,
            body: responseBody
        });


        if (response.ok) {
            alert("Report submitted successfully");
            return;
        }


        if (response.status === 400) {
            alert("The address could not be resolved or is outside the Netherlands.");
        } else if (response.status === 422) {
            alert("The submitted form data is invalid.");
        } else if (response.status === 502) {
            alert("The geocoding service is temporarily unavailable. Please try again later.");
        } else {
            alert("There was an error submitting the report. Please try again.");
        }

    } catch (error) {

        console.error("Report submission error:", error);

        alert("There was an error submitting the report. Please check the connection and try again.");

    }


});


/*
--------------------------------------------------
SMALL SECURITY HELPER
--------------------------------------------------
*/

function escapeHTML(value) {

    const div = document.createElement("div");

    div.textContent = value;

    return div.innerHTML;

}
