/*
COS30045 Data Visualisation - Group 2
Three-page navigation (tabs) with previous / next arrows and a "1 of 3" pager
Dayaanan
*/

(() => {

    // Which section ids belong on which page.
    // Sections that are not listed here stay on page 1, so nothing disappears.
    const PAGES = [
        {
            title: "Overview",
            sections: [
                "national-section",
                "state-section",
                "road-user-section",
                "first-nations-section"
            ]
        },
        {
            title: "Changes & Comparisons",
            sections: [
                "national-change-section",   // Chart 2 (Man Yee)
                "state-dumbbell-section",    // Chart 6 (Lin Yan)
                "road-user-slope-section"    // Chart 3 (Man Yee)
            ]
        },
        {
            title: "Composition & Communities",
            sections: [
                "first-nations-share-section",     // Chart 8
                "road-user-composition-section"    // Chart 9
            ]
        }
    ];

    function init() {

        const dashboard = document.querySelector(".dashboard-grid");
        if (!dashboard) return;

        const sections = Array.from(dashboard.querySelectorAll(":scope > section"));
        const allChartsButton = document.getElementById("show-all-charts");
        const siteNav = document.querySelector(".site-nav");

        let current = 0;

        // Page number (0-based) a section belongs to; unlisted sections go on page 1
        const pageOf = id => {
            const i = PAGES.findIndex(p => p.sections.includes(id));
            return i === -1 ? 0 : i;
        };

        // Top bar: [<] [1 Overview] [2 ...] [3 ...] [>]
        const bar = document.createElement("nav");
        bar.className = "page-tabs";
        bar.setAttribute("aria-label", "Dashboard pages");

        function makeArrow(direction) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "page-arrow";
            b.dataset.dir = direction;
            b.setAttribute("aria-label", direction < 0 ? "Previous page" : "Next page");
            b.textContent = direction < 0 ? "\u2039" : "\u203A";
            b.addEventListener("click", () => show(current + direction));
            return b;
        }

        const tabList = document.createElement("div");
        tabList.className = "page-tab-list";

        const tabButtons = PAGES.map((page, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "page-tab";
            b.textContent = `${i + 1}. ${page.title}`;
            b.addEventListener("click", () => show(i));
            tabList.appendChild(b);
            return b;
        });

        const liveStatus = document.createElement("span");
        liveStatus.className = "visually-hidden";
        liveStatus.setAttribute("aria-live", "polite");

        const topPrev = makeArrow(-1);
        const topNext = makeArrow(1);
        bar.append(topPrev, tabList, topNext, liveStatus);
        dashboard.parentNode.insertBefore(bar, dashboard);

        // Bottom pager: [<] 1 of 3 [>]  (like the Power BI page selector)
        const pager = document.createElement("nav");
        pager.className = "page-pager";
        pager.setAttribute("aria-label", "Dashboard page selector");

        const pagerText = document.createElement("span");
        const bottomPrev = makeArrow(-1);
        const bottomNext = makeArrow(1);
        pager.append(bottomPrev, pagerText, bottomNext);
        dashboard.after(pager);

        // Message shown if a page has no charts yet
        const empty = document.createElement("p");
        empty.className = "page-empty";
        empty.hidden = true;
        empty.textContent = "The charts for this page are coming soon.";
        dashboard.appendChild(empty);

        // Show one page, hide the others
        function show(index) {
            index = Math.max(0, Math.min(PAGES.length - 1, index));

            // Leave Focus Mode before changing page
            if (index !== current && allChartsButton) {
                allChartsButton.click();
            }

            current = index;

            let visibleCount = 0;
            sections.forEach(section => {
                const onPage = pageOf(section.id) === current;
                section.classList.toggle("tab-hidden", !onPage);
                if (onPage) visibleCount++;
            });
            empty.hidden = visibleCount > 0;

            // The CSS uses this to give pages with 1-2 charts a full-height row
            dashboard.dataset.count = visibleCount;

            tabButtons.forEach((b, i) => {
                b.classList.toggle("active", i === current);
                if (i === current) b.setAttribute("aria-current", "page");
                else b.removeAttribute("aria-current");
            });

            [topPrev, bottomPrev].forEach(b => b.disabled = current === 0);
            [topNext, bottomNext].forEach(b => b.disabled = current === PAGES.length - 1);

            pagerText.textContent = `${current + 1} of ${PAGES.length}`;
            liveStatus.textContent =
                `Page ${current + 1} of ${PAGES.length}: ${PAGES[current].title}`;
        }

        // Left/Right arrow keys move between pages while a page button has focus
        bar.addEventListener("keydown", event => {
            if (!event.target.closest(".page-tab")) return;

            let next = null;
            if (event.key === "ArrowRight") next = current + 1;
            if (event.key === "ArrowLeft") next = current - 1;
            if (next === null || next < 0 || next >= PAGES.length) return;

            event.preventDefault();
            show(next);
            tabButtons[current].focus();
        });

        // Header links (National Trends, States, ...) switch to the right page first
        if (siteNav) {
            siteNav.addEventListener("click", event => {
                const link = event.target.closest('a[href^="#"]');
                if (!link || link.id === "show-all-charts") return;

                const id = link.getAttribute("href").slice(1);
                const target = document.getElementById(id);

                if (target && target.classList.contains("tab-hidden")) {
                    show(pageOf(id));
                }
            }, true);
        }

        show(0);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();