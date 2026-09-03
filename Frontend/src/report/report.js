import { renderReportView } from "./reportView.js";
import { refreshFloodData } from "../Map/floodLayer.js";

renderReportView(document.body);

let mapInstance = null;

/**
 * Initialize the report page with a map instance.
 * Call this after creating the map to enable form submission features.
 */
export function setupReportPage(map) {
    mapInstance = map;
}

const reportToggle = document.getElementById("reportToggle");
const reportPanel = document.getElementById("reportPanel");
const closeReport = document.getElementById("closeReport");

const reportForm = document.getElementById("reportForm");

const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("addressSuggestions");
const announcementCities = document.getElementById("announcementCities");
const announcementStatus = document.getElementById("announcementStatus");

const TEST_MODE = false;

const MESSAGES_URL = "http://127.0.0.1:8000/messages";
const REFRESH_INTERVAL_MS = 30_000;

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
let isLoadingAnnouncements = false;


document.addEventListener("DOMContentLoaded", function () {
    startAnnouncementRefresh();
});


function startAnnouncementRefresh() {
    loadAnnouncements();

    const refreshTimer = window.setInterval(function () {
        if (document.visibilityState === "visible") {
            loadAnnouncements();
        }
    }, REFRESH_INTERVAL_MS);

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            loadAnnouncements();
        }
    });

    window.addEventListener("pagehide", function () {
        window.clearInterval(refreshTimer);
    }, { once: true });
}


async function loadAnnouncements() {
    if (isLoadingAnnouncements) {
        return;
    }

    isLoadingAnnouncements = true;
    setAnnouncementStatus("Loading announcements...");

    try {
        publishedAnnouncements = TEST_MODE
            ? mockAnnouncements
            : await getAnnouncementJson(MESSAGES_URL);

        console.log("Published announcements:", publishedAnnouncements);
        renderAnnouncementCities(publishedAnnouncements);

        if (publishedAnnouncements.length === 0) {
            selectedAnnouncementCity = "";
            setAnnouncementStatus("There are currently no published announcements.");
        } else if (selectedAnnouncementCity && publishedAnnouncements.some(function (message) {
            return normaliseAnnouncementCity(message.city) === normaliseAnnouncementCity(selectedAnnouncementCity);
        })) {
            selectAnnouncementCity(selectedAnnouncementCity);
        } else {
            selectedAnnouncementCity = "";
            setAnnouncementStatus("Select a city to read its announcements.");
        }
    } catch (error) {
        console.error("Could not load announcements:", error);
        announcementCities.replaceChildren();
        setAnnouncementStatus("Announcements could not be loaded. Please try again later.", true);
    } finally {
        isLoadingAnnouncements = false;
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
        const cityCard = document.createElement("div");
        cityCard.className = "city-card collapsed";
        cityCard.dataset.city = city;

        const collapsibleHeader = document.createElement("button");
        collapsibleHeader.type = "button";
        collapsibleHeader.className = "city-collapsible-header";
        collapsibleHeader.setAttribute("aria-expanded", "false");
        collapsibleHeader.setAttribute("data-section", city);

        const headerContent = document.createElement("div");
        const headerText = document.createElement("span");
        headerText.className = "city-name";
        headerText.textContent = city;

        const icon = document.createElement("svg");
        icon.className = "collapsible-icon";
        icon.setAttribute("width", "20");
        icon.setAttribute("height", "20");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "2");
        const polyline = document.createElement("polyline");
        polyline.setAttribute("points", "6 9 12 15 18 9");
        icon.appendChild(polyline);

        headerContent.appendChild(headerText);
        collapsibleHeader.appendChild(headerContent);
        collapsibleHeader.appendChild(icon);

        const messagesContainer = document.createElement("div");
        messagesContainer.className = "city-messages-container";
        messagesContainer.setAttribute("data-city", city);

        cityCard.appendChild(collapsibleHeader);
        cityCard.appendChild(messagesContainer);

        collapsibleHeader.addEventListener("click", function (e) {
            e.preventDefault();
            toggleCityCollapsible(city);
        });

        announcementCities.appendChild(cityCard);
    });
}


function selectAnnouncementCity(city) {
    selectedAnnouncementCity = city;

    const cityMessages = publishedAnnouncements.filter(function (message) {
        return normaliseAnnouncementCity(message.city) === normaliseAnnouncementCity(city);
    });

    renderAnnouncementMessages(city, cityMessages);

    console.log(`Announcements for ${city}:`, cityMessages);
}


function toggleCityCollapsible(city) {
    const cityCard = announcementCities.querySelector(`[data-city="${city}"]`);
    if (!cityCard) return;

    const header = cityCard.querySelector(".city-collapsible-header");
    const isExpanded = header.getAttribute("aria-expanded") === "true";

    header.setAttribute("aria-expanded", String(!isExpanded));
    cityCard.classList.toggle("collapsed", isExpanded);

    // Load messages when opening (if it was closed, now it's opening)
    if (!isExpanded) {
        selectAnnouncementCity(city);
    }
}


function renderAnnouncementMessages(city, messages) {
    const messagesContainer = announcementCities.querySelector(
        `.city-messages-container[data-city="${city}"]`
    );
    
    if (!messagesContainer) return;

    messagesContainer.replaceChildren();

    messages.forEach(function (message) {
        const card = document.createElement("article");
        card.className = "announcement-card";
        
        const heading = document.createElement("h3");
        heading.textContent = city;
        
        const text = document.createElement("p");
        text.textContent = message.msg;
        
        card.appendChild(heading);
        card.appendChild(text);
        messagesContainer.appendChild(card);
    });
    
    // Trigger animation
    messagesContainer.classList.add("expanded");
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

    // Clear previous errors
    const formErrorsContainer = document.getElementById("formErrors");
    formErrorsContainer.replaceChildren();

    // Validate form
    const validationErrors = validateReportForm();
    
    if (validationErrors.length > 0) {
        displayFormErrors(validationErrors);
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
        displayFormErrors(["Frontend test successful"]);
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
            // Refresh the map with latest flood data
            if (mapInstance) {
                await refreshFloodData(mapInstance);
            }
            
            // Clear the form
            reportForm.reset();
            selectedAddress = "";
            addressInput.value = "";
            suggestionsBox.replaceChildren();
            
            // Close the report panel
            reportPanel.classList.remove("open");
            
            // Show success message
            showSuccessMessage("Report submitted successfully!");
            return;
        }

        // Handle error responses
        const errors = [];
        
        if (response.status === 400) {
            errors.push("The address could not be resolved or is outside the Netherlands.");
        } else if (response.status === 422) {
            errors.push("The submitted form data is invalid.");
        } else if (response.status === 502) {
            errors.push("The geocoding service is temporarily unavailable. Please try again later.");
        } else {
            errors.push("There was an error submitting the report. Please try again.");
        }
        
        displayFormErrors(errors);

    } catch (error) {

        console.error("Report submission error:", error);

        displayFormErrors(["There was an error submitting the report. Please check the connection and try again."]);

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


/*
--------------------------------------------------
SUCCESS NOTIFICATION
--------------------------------------------------
*/

function showSuccessMessage(message) {
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    notification.setAttribute("role", "status");
    notification.setAttribute("aria-live", "polite");
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(function () {
        notification.classList.add("show");
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(function () {
        notification.classList.remove("show");
        setTimeout(function () {
            notification.remove();
        }, 300);
    }, 3000);
}


/*
--------------------------------------------------
FORM VALIDATION
--------------------------------------------------
*/

/**
 * Validate the report form and return an array of error messages
 */
function validateReportForm() {
    const errors = [];
    const formData = new FormData(reportForm);

    // Validate address
    if (!selectedAddress) {
        errors.push("Please select an address from the suggestions.");
    }

    // Validate phone number
    const phone = formData.get("phone").trim();
    if (!phone) {
        errors.push("Phone number is required.");
    } else if (!isValidPhoneNumber(phone)) {
        errors.push("Phone number must start with country code (+31) or 06 (Netherlands format).");
    }

    // Validate flood level
    if (!formData.get("floodLevel")) {
        errors.push("Please select a flood level.");
    }

    // Validate water movement
    if (!formData.get("waterMovement")) {
        errors.push("Please select water movement.");
    }

    // Validate road condition
    if (!formData.get("roadCondition")) {
        errors.push("Please select a road condition.");
    }

    return errors;
}

/**
 * Check if phone number is in valid Netherlands format
 * Accepts: +31..., 06..., 0031...
 */
function isValidPhoneNumber(phone) {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s\-]/g, "");
    
    // Check for valid Netherlands formats
    // +31 followed by digits
    if (cleaned.match(/^\+31\d{6,}$/)) {
        return true;
    }
    
    // 06 followed by digits (Dutch mobile format)
    if (cleaned.match(/^06\d{6,}$/)) {
        return true;
    }
    
    // 0031 followed by digits (alternative format)
    if (cleaned.match(/^0031\d{6,}$/)) {
        return true;
    }
    
    return false;
}

/**
 * Display form validation errors in the error container
 */
function displayFormErrors(errors) {
    const formErrorsContainer = document.getElementById("formErrors");
    formErrorsContainer.replaceChildren();

    if (errors.length === 0) {
        return;
    }

    const errorList = document.createElement("ul");
    errorList.className = "error-list";

    errors.forEach(function (error) {
        const errorItem = document.createElement("li");
        errorItem.textContent = error;
        errorList.appendChild(errorItem);
    });

    formErrorsContainer.appendChild(errorList);
    formErrorsContainer.classList.add("visible");
    
    // Scroll to error container
    formErrorsContainer.scrollIntoView({ behavior: "smooth", block: "center" });
}
