// Builds the admin overlay DOM (topbar + floating sidebar) on top of the map.
// Kept as a template (not static HTML) so the page markup lives alongside its JS, like main.js/mapInit.js do for the map.
export function renderAdminView(root) {
  root.insertAdjacentHTML(
    "beforeend",
    `
    <header class="topbar">
        <div>
            <p class="eyebrow">Flood reporting</p>
            <h1>Admin alerts</h1>
        </div>
    </header>

    <main class="admin-layout">

        <section class="card cities-section" aria-labelledby="citiesTitle">
            <div class="section-header">
                <div>
                    <p class="eyebrow dark">Situation overview</p>
                    <h2 id="citiesTitle">Reported cities</h2>
                </div>

                <button id="refreshButton" class="secondary-button" type="button">
                    Refresh
                </button>
            </div>

            <p class="section-description">
                Select a city to prepare an emergency alert.
            </p>

            <div id="citiesStatus" class="status-message" role="status"></div>
            <div id="citiesList" class="cities-list"></div>
        </section>

        <aside class="card alert-panel" aria-labelledby="alertTitle">
            <p class="eyebrow">Public communication</p>
            <h2 id="alertTitle">Send emergency alert</h2>

            <form id="alertForm">
                <div class="form-group">
                    <label for="selectedCity">
                        City <span class="required-marker" aria-hidden="true">*</span>
                    </label>
                    <input
                        id="selectedCity"
                        name="city"
                        type="text"
                        placeholder="Select a reported city"
                        readonly
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="alertMessage">
                        Message <span class="required-marker" aria-hidden="true">*</span>
                    </label>
                    <textarea
                        id="alertMessage"
                        name="message"
                        rows="6"
                        placeholder="Write clear instructions for residents..."
                        required
                    ></textarea>
                </div>

                <button id="sendButton" class="primary-button" type="submit">
                    Send alert
                </button>

                <div id="formStatus" class="status-message panel-status" role="status"></div>
            </form>
        </aside>

        <section class="card messages-section" aria-labelledby="messagesTitle">
            <div class="section-header">
                <div>
                    <p class="eyebrow dark">Published alerts</p>
                    <h2 id="messagesTitle">Active messages</h2>
                </div>
            </div>

            <div id="messagesStatus" class="status-message" role="status"></div>
            <div id="messagesList" class="messages-list"></div>
        </section>

    </main>
    `
  );
}
