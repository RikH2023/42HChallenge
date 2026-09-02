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
            <button class="collapsible-header" type="button" aria-expanded="true" data-section="cities-section">
                <div>
                    <p class="eyebrow dark">Situation overview</p>
                    <h2 id="citiesTitle">Reported cities</h2>
                </div>
                <svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            <div class="card-content">
                <p class="section-description">
                    Select a city to prepare an emergency alert.
                </p>

                <div id="citiesStatus" class="status-message" role="status"></div>
                <div id="citiesList" class="cities-list"></div>

                <button id="refreshButton" class="secondary-button" type="button" style="width: 100%; margin-top: 10px;">
                    Refresh
                </button>
            </div>
        </section>

        <aside class="card alert-panel" aria-labelledby="alertTitle">
            <button class="collapsible-header" type="button" aria-expanded="true" data-section="alert-panel">
                <div>
                    <p class="eyebrow">Public communication</p>
                    <h2 id="alertTitle">Send emergency alert</h2>
                </div>
                <svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            <div class="card-content">
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
            </div>
        </aside>

        <section class="card messages-section" aria-labelledby="messagesTitle">
            <button class="collapsible-header" type="button" aria-expanded="true" data-section="messages-section">
                <div>
                    <p class="eyebrow dark">Published alerts</p>
                    <h2 id="messagesTitle">Active messages</h2>
                </div>
                <svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            <div class="card-content">
                <div id="messagesStatus" class="status-message" role="status"></div>
                <div id="messagesList" class="messages-list"></div>
            </div>
        </section>

    </main>
    `
  );
  
  // Initialize collapsible functionality
  initializeCollapsibleSections();
}

function initializeCollapsibleSections() {
  const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
  
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const card = this.closest('.card');
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      
      this.setAttribute('aria-expanded', String(!isExpanded));
      card.classList.toggle('collapsed');
      
      const icon = this.querySelector('.collapsible-icon');
      icon.classList.toggle('collapsed');
    });
  });
}
