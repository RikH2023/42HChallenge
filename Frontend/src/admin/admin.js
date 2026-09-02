import { renderAdminView } from "./adminView.js";

renderAdminView(document.body);

const TEST_MODE = false;

const API_BASE_URL = "http://127.0.0.1:8000";
const REFRESH_INTERVAL_MS = 30_000;

const citiesList = document.getElementById("citiesList");
const citiesStatus = document.getElementById("citiesStatus");
const messagesList = document.getElementById("messagesList");
const messagesStatus = document.getElementById("messagesStatus");
const refreshButton = document.getElementById("refreshButton");

const alertForm = document.getElementById("alertForm");
const selectedCityInput = document.getElementById("selectedCity");
const alertMessageInput = document.getElementById("alertMessage");
const sendButton = document.getElementById("sendButton");
const formStatus = document.getElementById("formStatus");

let selectedCity = "";
let isLoadingDashboard = false;
let lastLoadedMessages = [];

let mockCities = [
    { city: "Eindhoven", report_count: 2, highest_severity: "high" },
    { city: "Tilburg", report_count: 1, highest_severity: "low" }
];

let mockMessages = [
    {
        id: "mock-message-1",
        city: "Eindhoven",
        msg: "Demo emergency message 1."
    },
    {
        id: "mock-message-2",
        city: "Eindhoven",
        msg: "Demo emergency message 2."
    },
    {
        id: "mock-message-3",
        city: "Tilburg",
        msg: "Demo emergency message 1."
    }
];


document.addEventListener("DOMContentLoaded", function () {
    startDashboardRefresh();
});


function startDashboardRefresh() {
    loadDashboard();

    const refreshTimer = window.setInterval(function () {
        if (document.visibilityState === "visible") {
            loadDashboard();
        }
    }, REFRESH_INTERVAL_MS);

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            loadDashboard();
        }
    });

    window.addEventListener("pagehide", function () {
        window.clearInterval(refreshTimer);
    }, { once: true });
}


refreshButton.addEventListener("click", function () {
    loadDashboard();
});


alertForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearStatus(formStatus);

    if (!selectedCity) {
        setStatus(formStatus, "Select a reported city before sending an alert.", "error");
        citiesList.querySelector(".city-card")?.focus();
        return;
    }

    const message = alertMessageInput.value.trim();

    if (!message) {
        setStatus(formStatus, "Enter an emergency message.", "error");
        alertMessageInput.focus();
        return;
    }

    const payload = {
        city: selectedCity,
        msg: message
    };

    console.log("Admin alert request:", payload);

    setButtonBusy(sendButton, true, "Sending...");

    try {
        let createdMessage;

        if (TEST_MODE) {
            createdMessage = {
                id: `mock-message-${Date.now()}`,
                ...payload
            };
            mockMessages.push(createdMessage);
            console.log("Mock admin alert response:", createdMessage);
        } else {
            const response = await fetch(`${API_BASE_URL}/admin/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const responseBody = await readResponseBody(response);

            console.log("Admin alert response:", {
                status: response.status,
                body: responseBody
            });

            if (!response.ok) {
                throw new Error(getApiError(responseBody, "The alert could not be sent."));
            }

            createdMessage = responseBody;
        }

        alertMessageInput.value = "";
        setStatus(formStatus, `Alert sent for ${createdMessage.city}.`, "success");
        await loadMessages();
    } catch (error) {
        console.error("Admin alert submission error:", error);
        setStatus(formStatus, error.message || "The alert could not be sent.", "error");
    } finally {
        setButtonBusy(sendButton, false, "Send alert");
    }
});


async function loadDashboard() {
    if (isLoadingDashboard) {
        return;
    }

    isLoadingDashboard = true;
    refreshButton.disabled = true;

    try {
        await Promise.all([loadCities(), loadMessages()]);
    } finally {
        isLoadingDashboard = false;
        refreshButton.disabled = false;
    }
}


async function loadCities() {
    setStatus(citiesStatus, "Loading reported cities...");

    try {
        const cities = TEST_MODE
            ? mockCities
            : await getJson(`${API_BASE_URL}/admin/cities`);

        console.log("Admin cities:", cities);
        renderCities(cities);

        if (cities.length === 0) {
            setStatus(citiesStatus, "No cities currently have flood reports.");
        } else {
            clearStatus(citiesStatus);
        }
    } catch (error) {
        console.error("Could not load reported cities:", error);
        citiesList.replaceChildren();
        setStatus(citiesStatus, "Reported cities could not be loaded.", "error");
    }
}


async function loadMessages() {
    setStatus(messagesStatus, "Loading active messages...");

    try {
        const messages = TEST_MODE
            ? mockMessages
            : await getJson(`${API_BASE_URL}/admin/messages`);

        console.log("Admin messages:", messages);
        
        // Save the full list
        lastLoadedMessages = messages;
        
        // If a city is selected, show only messages for that city
        if (selectedCity) {
            const cityMessages = messages.filter(function (message) {
                return message.city === selectedCity;
            });
            renderMessages(cityMessages);
            
            if (cityMessages.length === 0) {
                setStatus(messagesStatus, `No active alerts for ${selectedCity} yet.`);
            } else {
                clearStatus(messagesStatus);
            }
        } else {
            // Show all messages if no city selected
            renderMessages(messages);
            
            if (messages.length === 0) {
                setStatus(messagesStatus, "There are no active messages.");
            } else {
                clearStatus(messagesStatus);
            }
        }
    } catch (error) {
        console.error("Could not load admin messages:", error);
        messagesList.replaceChildren();
        setStatus(messagesStatus, "Active messages could not be loaded.", "error");
    }
}


function renderCities(cities) {
    citiesList.replaceChildren();

    cities.forEach(function (summary) {
        const cityButton = document.createElement("button");
        const cityDetails = document.createElement("span");
        const cityName = document.createElement("span");
        const reportCount = document.createElement("span");
        const severity = document.createElement("span");

        cityButton.type = "button";
        cityButton.className = "city-card";
        cityButton.dataset.city = summary.city;
        cityButton.setAttribute("aria-pressed", String(summary.city === selectedCity));

        if (summary.city === selectedCity) {
            cityButton.classList.add("selected");
        }

        cityName.className = "city-name";
        cityName.textContent = summary.city;

        reportCount.className = "report-count";
        reportCount.textContent = `${summary.report_count} ${summary.report_count === 1 ? "report" : "reports"}`;

        cityDetails.append(cityName, reportCount);

        const severityName = formatSeverity(summary.highest_severity);
        severity.className = `severity-badge severity-${summary.highest_severity}`;
        severity.textContent = `Highest: ${severityName}`;

        cityButton.append(cityDetails, severity);
        cityButton.addEventListener("click", function () {
            selectCity(summary.city);
        });

        citiesList.appendChild(cityButton);
    });
}


function selectCity(city) {
    selectedCity = city;
    selectedCityInput.value = city;

    citiesList.querySelectorAll(".city-card").forEach(function (cityButton) {
        const isSelected = cityButton.dataset.city === city;
        cityButton.classList.toggle("selected", isSelected);
        cityButton.setAttribute("aria-pressed", String(isSelected));
    });

    clearStatus(formStatus);
    
    // Refresh messages to show only for the selected city
    loadMessages();

    console.log("Selected alert city:", city);
}


function renderMessages(messages) {
    messagesList.replaceChildren();

    messages.forEach(function (message) {
        const messageCard = document.createElement("article");
        const content = document.createElement("div");
        const city = document.createElement("h3");
        const text = document.createElement("p");
        const retractButton = document.createElement("button");

        messageCard.className = "message-card";

        city.className = "message-city";
        city.textContent = message.city;

        text.className = "message-text";
        text.textContent = message.msg;

        content.append(city, text);

        retractButton.type = "button";
        retractButton.className = "retract-button";
        retractButton.textContent = "Retract";
        retractButton.setAttribute("aria-label", `Retract alert for ${message.city}`);
        retractButton.addEventListener("click", function () {
            retractMessage(message, retractButton);
        });

        messageCard.append(content, retractButton);
        messagesList.appendChild(messageCard);
    });
}


async function retractMessage(message, button) {
    clearStatus(messagesStatus);
    setButtonBusy(button, true, "Retracting...");

    try {
        if (TEST_MODE) {
            mockMessages = mockMessages.filter(function (item) {
                return item.id !== message.id;
            });
            console.log("Mock alert retracted:", message.id);
        } else {
            const response = await fetch(
                `${API_BASE_URL}/admin/messages/${encodeURIComponent(message.id)}`,
                { method: "DELETE" }
            );

            console.log("Retract alert response:", {
                status: response.status,
                messageId: message.id
            });

            if (!response.ok) {
                const responseBody = await readResponseBody(response);
                throw new Error(getApiError(responseBody, "The alert could not be retracted."));
            }
        }

        await loadMessages();
        setStatus(messagesStatus, `Alert for ${message.city} retracted.`, "success");
    } catch (error) {
        console.error("Could not retract admin message:", error);
        setStatus(messagesStatus, error.message || "The alert could not be retracted.", "error");
        setButtonBusy(button, false, "Retract");
    }
}


async function getJson(url) {
    const response = await fetch(url);
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
        throw new Error(getApiError(responseBody, "The server request failed."));
    }

    return responseBody;
}


async function readResponseBody(response) {
    return response.json().catch(function () {
        return null;
    });
}


function getApiError(responseBody, fallbackMessage) {
    return responseBody?.detail || fallbackMessage;
}


function formatSeverity(severity) {
    const labels = {
        low: "Low",
        mid: "Medium",
        high: "High"
    };

    return labels[severity] || severity;
}


function setStatus(element, message, type = "") {
    element.textContent = message;
    element.classList.toggle("error", type === "error");
    element.classList.toggle("success", type === "success");
    
    // Auto-clear success messages after 5 seconds
    if (type === "success") {
        window.setTimeout(function() {
            if (element.textContent === message && element.classList.contains("success")) {
                clearStatus(element);
            }
        }, 5000);
    }
}


function clearStatus(element) {
    setStatus(element, "");
}


function setButtonBusy(button, isBusy, label) {
    button.disabled = isBusy;
    button.textContent = label;
}
