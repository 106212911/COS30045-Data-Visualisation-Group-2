
/*
COS30045 Data Visualisation - Group 2
Chart Expansion Controls
Purpose: Allow users to enlarge charts for easier reading.
AI-assisted implementation reviewed and tested by the team.
*/

(() => {
    function initialiseChartExpansion() {
        const dashboard = document.querySelector(
            "main.dashboard-grid"
        );

        if (!dashboard) return;

        const sections = Array.from(
            dashboard.querySelectorAll(":scope > section")
        );

        const buttons = new Map();

        function updateButtons() {
            sections.forEach(section => {
                const button = buttons.get(section);
                if (!button) return;

                const expanded =
                    section.classList.contains("focused");

                const title =
                    section.querySelector("h2")?.textContent.trim()
                    || "chart";

                button.textContent = expanded ? "Close" : "Expand";
                button.setAttribute(
                    "aria-label",
                    expanded ? `Close ${title}` : `Expand ${title}`
                );
                button.setAttribute("aria-expanded", String(expanded));
            });
        }

        function closeExpandedChart() {
            dashboard.classList.remove("focus-mode");

            sections.forEach(section => {
                section.classList.remove("focused");
            });

            updateButtons();
        }

        function toggleChart(section) {
            if (section.classList.contains("focused")) {
                closeExpandedChart();
                return;
            }

            dashboard.classList.add("focus-mode");

            sections.forEach(item => {
                item.classList.toggle(
                    "focused",
                    item === section
                );
            });

            updateButtons();
        }

        sections.forEach(section => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "chart-expand-btn";

            button.addEventListener("click", () => {
                toggleChart(section);
            });

            section.appendChild(button);
            buttons.set(section, button);
        });

        updateButtons();

        // Keep buttons in sync with existing tab navigation.
        document.querySelectorAll(
            ".page-tab, .page-arrow, #show-all-charts"
        ).forEach(button => {
            button.addEventListener(
                "click",
                closeExpandedChart
            );
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeExpandedChart();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth < 1000) {
                closeExpandedChart();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseChartExpansion
        );
    } else {
        initialiseChartExpansion();
    }
})();
