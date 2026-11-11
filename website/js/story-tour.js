/*
COS30045 Data Visualisation — Group 2
Optional guided story for the three-tab D3.js dashboard.

AI-assistance disclosure: ChatGPT assisted with the design and implementation
of the guided navigation, chart highlighting, and keyboard-accessible controls.
Prompt summary: "Add a concise Explore the Story tour to the existing three-tab
road crash hospitalisation dashboard without replacing its chart scripts."
The team should review and test this code before submission.
*/

(() => {
    "use strict";

    // All figures come from Group2_Road_Injury_Cleaned.csv (BITRE, 2023).
    // They represent hospitalisation counts and changes, not injury rates.

    const STORY_STEPS = [
        {
            title: "The national picture",
            figure: "−4.8% in 2020",
            explanation:
                "National hospitalisations fell from 39,866 in 2019 to 37,966 in 2020. But the national trend is only part of the story.",
            focusText:
                "Look at the orange 2020 point in the line chart.",
            chartLabel: "National Hospitalisation Trends",
            sectionId: "national-section",
            pageIndex: 0
        },
        {
            title: "Not every state followed the same trend",
            figure: "Queensland: +65.2%",
            explanation:
                "Between 2011 and 2021, Queensland recorded a 65.2% increase, while New South Wales decreased by 15.2%. Regional patterns were different.",
            focusText:
                "Find Queensland and New South Wales in the dumbbell chart.",
            chartLabel: "State & Territory Dumbbell",
            sectionId: "state-dumbbell-section",
            pageIndex: 1
        },
        {
            title: "Road-user patterns also differed",
            figure: "Pedal cyclists: +51.4%",
            explanation:
                "Pedal-cyclist hospitalisations increased from 5,391 to 8,163 between 2011 and 2021, while pedestrian hospitalisations decreased by 15.3%.",
            focusText:
                "Compare the pedal cyclist and pedestrian lines.",
            chartLabel: "Road User Slope Chart",
            sectionId: "road-user-slope-section",
            pageIndex: 1
        },
        {
            title: "One year, different patterns",
            figure: "First Nations: +23.4%",
            explanation:
                "In 2020, First Nations hospitalisations increased by 23.4% while national hospitalisations declined. National totals do not tell every group's story.",
            focusText:
                "Look at the change from 2019 to 2020. The counts do not explain why this happened.",
            chartLabel: "First Nations Hospitalisation Trends",
            sectionId: "first-nations-section",
            pageIndex: 2
        }
    ];


    function initStoryTour() {
        const tabBar = document.querySelector(".page-tabs");
        const pageButtons = Array.from(document.querySelectorAll(".page-tab"));
        const dashboard = document.querySelector("main.dashboard-grid");

        // tabs.js must run first. Fail quietly if the page structure differs.
        if (!tabBar || pageButtons.length !== 3 || !dashboard) return;

        const launch = document.createElement("button");
        launch.type = "button";
        launch.id = "story-launch";
        launch.className = "story-launch";
        launch.textContent = "Explore the Story";
        launch.setAttribute("aria-controls", "story-tour-panel");
        launch.setAttribute("aria-expanded", "false");
        tabBar.appendChild(launch);

        const panel = document.createElement("aside");
        panel.id = "story-tour-panel";
        panel.className = "story-tour-panel";
        panel.hidden = true;
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", "story-heading");
        panel.innerHTML = `
            <div class="story-panel-heading">
                <h2 id="story-heading" tabindex="-1">Explore the Story</h2>
                <button type="button" class="story-close" aria-label="Close story tour">×</button>
            </div>
            <p class="story-progress"></p>
            <div class="story-content" aria-live="polite" aria-atomic="true">
                <h3 class="story-title"></h3>
                <p class="story-figure"></p>
                <p class="story-explanation"></p>
                <p class="story-target"></p>
            </div>
            <div class="story-actions">
                <button type="button" class="story-prev">Previous</button>
                <button type="button" class="story-next">Next</button>
            </div>
            <p class="story-note">Counts are not population-adjusted injury rates.</p>
        `;
        document.body.appendChild(panel);

        const closeButton = panel.querySelector(".story-close");
        const previousButton = panel.querySelector(".story-prev");
        const nextButton = panel.querySelector(".story-next");
        let isOpen = false;
        let currentStep = 0;
        let switchingPageForTour = false;

        function clearHighlight() {
            dashboard.querySelectorAll("section.story-highlight").forEach(section => {
                section.classList.remove("story-highlight");
            });
        }

        function closeTour(returnFocus = false) {
            if (!isOpen) return;
            isOpen = false;
            panel.hidden = true;
            launch.setAttribute("aria-expanded", "false");
            launch.classList.remove("story-launch-active");
            clearHighlight();
            if (returnFocus) launch.focus();
        }

        function showStep(index) {
            currentStep = Math.max(0, Math.min(index, STORY_STEPS.length - 1));
            const story = STORY_STEPS[currentStep];
            const section = document.getElementById(story.sectionId);
            if (!section) {
                closeTour(true);
                return;
            }

            // Reuse existing tab logic; do not duplicate or replace tabs.js.
            // Clicking the page tab also safely closes a previously expanded chart.
            switchingPageForTour = true;
            pageButtons[story.pageIndex].click();
            switchingPageForTour = false;

            clearHighlight();
            section.classList.add("story-highlight");

            panel.querySelector(".story-progress").textContent =
                `Finding ${currentStep + 1} of ${STORY_STEPS.length}`;
            panel.querySelector(".story-title").textContent = story.title;
            panel.querySelector(".story-figure").textContent = story.figure;
            panel.querySelector(".story-explanation").textContent = story.explanation;

            panel.querySelector(".story-target").textContent =
                story.focusText;


            previousButton.disabled = currentStep === 0;
            nextButton.textContent =
                currentStep === STORY_STEPS.length - 1 ? "Finish" : "Next";

            // Keep the active chart visible instead of covering it with the tour.
            const rect = section.getBoundingClientRect();
            panel.dataset.position = rect.width > window.innerWidth * 0.75
                ? "top-right"
                : (rect.left > window.innerWidth * 0.4 ? "bottom-left" : "bottom-right");
        }

        launch.addEventListener("click", () => {
            if (isOpen) {
                closeTour(true);
                return;
            }
            isOpen = true;
            panel.hidden = false;
            launch.setAttribute("aria-expanded", "true");
            launch.classList.add("story-launch-active");
            showStep(0);
            panel.querySelector("#story-heading").focus();
        });

        closeButton.addEventListener("click", () => closeTour(true));
        previousButton.addEventListener("click", () => showStep(currentStep - 1));
        nextButton.addEventListener("click", () => {
            if (currentStep === STORY_STEPS.length - 1) closeTour(true);
            else showStep(currentStep + 1);
        });

        // If a user independently chooses a different dashboard tab,
        // end the tour instead of leaving the previous step highlighted.
        pageButtons.forEach(button => {
            button.addEventListener("click", () => {
                if (isOpen && !switchingPageForTour) closeTour(false);
            });
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && isOpen) closeTour(true);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initStoryTour);
    } else {
        initStoryTour();
    }
})();
