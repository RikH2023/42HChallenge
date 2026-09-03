// Builds the report overlay DOM (topbar + announcements card + report form) on top of the map.
// Kept as a template (not static HTML) so the page markup lives alongside its JS, like main.js/mapInit.js do for the map.
export function renderReportView(root) {
  root.insertAdjacentHTML(
    "beforeend",
    `
    <header class="topbar">

        <div class="navigation-title">
            FloodWatch
        </div>

        <button id="reportToggle" class="report-toggle">
            Report
        </button>

    </header>


    <main class="main-area">

        <aside class="cities-sidebar" aria-label="Cities with announcements">
            <div class="cities-sidebar-header">
                <p class="section-kicker">Active alerts</p>
                <h2>Cities</h2>
            </div>
            <div id="announcementCities" class="cities-list" aria-label="Cities with announcements"></div>
            <div id="announcementStatus" class="announcement-status" role="status"></div>
        </aside>


        <aside id="reportPanel" class="report-panel">

            <div class="panel-header">
                <h2>Report flooding</h2>

                <button
                    type="button"
                    id="closeReport"
                    class="close-button"
                    aria-label="Close report form"
                >
                    ×
                </button>
            </div>

            <div id="formErrors" class="form-errors" role="alert" aria-live="polite"></div>

            <form id="reportForm">

                <!-- ADDRESS -->
                <div class="form-group address-group">

                    <label for="address">
                        Address <span class="required-marker" aria-hidden="true">*</span>
                    </label>

                    <input
                        type="text"
                        id="address"
                        name="address"
                        placeholder="Start typing your address..."
                        autocomplete="off"
                    >

                    <div
                        id="addressSuggestions"
                        class="address-suggestions"
                    ></div>

                </div>


                <!-- PHONE -->
                <div class="form-group">

                    <label for="phone">
                        Phone <span class="required-marker" aria-hidden="true">*</span>
                    </label>

                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="06 12345678"
                    >

                </div>


                <!-- FLOOD LEVEL -->
                <div class="form-group">

                    <p>Flood level <span class="required-marker" aria-hidden="true">*</span></p>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="floodLevel"
                            value="low"
                        >
                        Low
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="floodLevel"
                            value="medium"
                        >
                        Medium
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="floodLevel"
                            value="high"
                        >
                        High
                    </label>

                </div>


                <!-- WATER MOVEMENT -->
                <div class="form-group">

                    <p>Water movement <span class="required-marker" aria-hidden="true">*</span></p>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="waterMovement"
                            value="still"
                        >
                        Still
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="waterMovement"
                            value="moving_slowly"
                        >
                        Moving slowly
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="waterMovement"
                            value="moving_quickly"
                        >
                        Moving quickly
                    </label>

                </div>


                <!-- ROAD CONDITION -->
                <div class="form-group">

                    <p>Road condition <span class="required-marker" aria-hidden="true">*</span></p>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="roadCondition"
                            value="passable"
                        >
                        Passable
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="roadCondition"
                            value="difficult"
                        >
                        Difficult
                    </label>

                    <label class="radio-option">
                        <input
                            type="radio"
                            name="roadCondition"
                            value="impassable"
                        >
                        Impassable
                    </label>

                </div>


                <button type="submit" class="submit-button">
                    Submit report
                </button>

            </form>

        </aside>

    </main>
    `
  );
}
