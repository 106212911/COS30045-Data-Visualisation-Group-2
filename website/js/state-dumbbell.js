/*
 * COS30045 Data Visualisation - Group 2
 * State & Territory Change: 2011 vs 2021 (dumbbell chart)
 * Contributor: Lin Yan
 * Dataset: BITRE hospitalised injury counts processed in KNIME
 *          (State Total records in Group2_Road_Injury_Cleaned.csv)
 *
 * Question answered: Which states and territories recorded more or fewer
 * road crash hospitalisations in 2021 than in 2011?
 *
 * Visual encoding
 *  - Position (x): hospitalisation count on a common zero-based axis
 *  - Marker shape: hollow circle = 2011, filled diamond = 2021
 *  - Line and diamond colour: blue solid = increase, orange dashed = decrease
 *  - Arrow and sign in the right-hand column repeat the direction in text,
 *    so colour is never the only cue (colour-blind friendly palette).
 *
 * Responsive layout: a wide layout (dashboard and Expand view) and a compact
 * layout (screens up to 768 px) are drawn from the same code.
 *
 * AI assistance disclosure: ChatGPT / Claude assisted with drafting this
 * D3 chart (layout, label placement, tooltip and keyboard code). The values
 * were checked against the cleaned CSV and the chart was tested by the
 * contributor. Describe the actual prompts and changes in the Design Book.
 */
(() => {
    const container = d3.select("#state-dumbbell-chart");
    if (container.empty()) return;

    // ---------- Layouts ----------
    const LAYOUTS = {
        wide: {
            W: 840, H: 370,
            margin: { top: 52, right: 115, bottom: 66, left: 200 },
            zeroInset: 56, maxDomain: 13000, tickStep: 2000,
            title: 15, name: 15, value: 14, pct: 15, tick: 13, axisTitle: 14, legend: 14,
            shortNames: false,
            legendX: [0, 95, 185, 305]     // 2011, 2021, increase, decrease
        },
        compact: {
            W: 380, H: 400,
            margin: { top: 58, right: 72, bottom: 72, left: 118 },
            zeroInset: 28, maxDomain: 15000, tickStep: 4000,
            title: 12, name: 12, value: 12, pct: 12, tick: 11, axisTitle: 12, legend: 12,
            shortNames: true,
            legendX: [0, 56, 112, 205]
        }
    };
    const compactQuery = window.matchMedia("(max-width: 768px)");
    const SHORT = { "Australian Capital Territory": "ACT" };   // compact layout only

    // ---------- Colours (Okabe-Ito blue and vermillion, as in the slope chart) ----------
    const BLUE = "#0072B2";
    const ORANGE = "#D55E00";
    const BLUE_TEXT = "#005A8E";    // darker text variants for normal-size contrast
    const ORANGE_TEXT = "#9C3C00";
    const NAVY = "#16324f";
    const GREY_TEXT = "#374151";

    const number = d3.format(",");
    const signedNumber = n => (n > 0 ? "+" : n < 0 ? "−" : "") + number(Math.abs(n));
    const signedPct = p => (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p).toFixed(1) + "%";

    const tooltip = container.append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip");

    const hideTooltip = () => tooltip.style("visibility", "hidden");

    // Show the tooltip above the row (or below it when there is no room above),
    // and keep it inside the chart container.
    function showTooltip(anchor, d) {
        const box = container.node().getBoundingClientRect();
        const rect = anchor.getBoundingClientRect();
        const change = d.end - d.start;

        tooltip.html(
            `<strong>${d.state}</strong><br>` +
            `2011: ${number(d.start)}<br>` +
            `2021: ${number(d.end)}<br>` +
            `Change: ${signedNumber(change)} (${signedPct(d.pct)})`
        ).style("visibility", "visible");

        const tipW = tooltip.node().offsetWidth;
        const tipH = tooltip.node().offsetHeight;
        const centreX = rect.left + rect.width / 2 - box.left;
        const x = Math.max(tipW / 2 + 4, Math.min(box.width - tipW / 2 - 4, centreX));
        const above = rect.top - box.top - 8;
        const showBelow = above < tipH;

        tooltip
            .style("left", `${x}px`)
            .style("top", `${showBelow ? rect.bottom - box.top + 8 : above}px`)
            .style("transform", showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)");
    }

    function failure(message) {
        console.error("State Dumbbell Chart:", message);
        container.append("p")
            .attr("role", "alert")
            .style("font-size", "14px")
            .text("Unable to display the State Dumbbell Chart. Check the data file.");
    }

    // ---------- Drawing ----------
    function draw(pairs, insight) {
        const L = compactQuery.matches ? LAYOUTS.compact : LAYOUTS.wide;
        const { W, H, margin } = L;
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;

        container.select("svg").remove();
        hideTooltip();

        const svg = container.insert("svg", ".chart-tooltip")
            .attr("viewBox", `0 0 ${W} ${H}`)
            .attr("role", "group")
            .attr("aria-labelledby", "dumbbell-title dumbbell-desc");

        svg.append("title")
            .attr("id", "dumbbell-title")
            .text("Change in hospitalisations by state and territory: 2011 versus 2021");

        svg.append("desc")
            .attr("id", "dumbbell-desc")
            .text(
                "Dumbbell chart comparing hospitalisation counts in 2011 and 2021 for each state and territory. " +
                pairs.map(d =>
                    `${d.state}: ${number(d.start)} in 2011 and ${number(d.end)} in 2021, ` +
                    `${d.up ? "an increase" : "a decrease"} of ${signedPct(d.pct)}.`
                ).join(" ") + " Values are counts, not injury rates."
            );

        const plot = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleLinear()
            .domain([0, L.maxDomain])
            .range([L.zeroInset, plotW]);

        const y = d3.scaleBand()
            .domain(pairs.map(d => d.state))
            .range([0, plotH])
            .paddingInner(0.25)
            .paddingOuter(0.1);

        // Title and insight
        svg.append("text")
            .attr("x", 18).attr("y", L.title + 9)
            .attr("font-size", L.title).attr("fill", GREY_TEXT)
            .text("Hospitalisations (counts) in 2011 and 2021");
        svg.append("text")
            .attr("x", 18).attr("y", L.title + 9 + L.title + 5)
            .attr("font-size", L.title).attr("font-weight", "bold").attr("fill", NAVY)
            .text(insight);

        // Axis and grid
        const ticks = d3.range(0, 12001, L.tickStep);

        plot.append("g").attr("aria-hidden", "true")
            .selectAll("line")
            .data(ticks)
            .join("line")
            .attr("x1", d => x(d)).attr("x2", d => x(d))
            .attr("y1", 0).attr("y2", plotH)
            .attr("stroke", "#e5e7eb");

        plot.append("g").attr("aria-hidden", "true")
            .attr("transform", `translate(0,${plotH + 4})`)
            .selectAll("text")
            .data(ticks)
            .join("text")
            .attr("x", d => x(d)).attr("y", 14)
            .attr("text-anchor", "middle")
            .attr("font-size", L.tick).attr("fill", GREY_TEXT)
            .text(d => number(d));

        plot.append("text")
            .attr("x", (L.zeroInset + plotW) / 2).attr("y", plotH + 38)
            .attr("text-anchor", "middle")
            .attr("font-size", L.axisTitle).attr("fill", GREY_TEXT)
            .text("Number of hospitalisations");

        svg.append("text")
            .attr("x", margin.left + plotW + 14).attr("y", margin.top - 10)
            .attr("font-size", L.tick).attr("fill", GREY_TEXT)
            .text("Change");

        // Rows
        const row = plot.selectAll(".dumbbell-row")
            .data(pairs, d => d.state)
            .join("g")
            .attr("class", "dumbbell-row")
            .attr("transform", d => `translate(0,${y(d.state)})`);

        const mid = y.bandwidth() / 2;
        const colour = d => d.up ? BLUE : ORANGE;
        const textColour = d => d.up ? BLUE_TEXT : ORANGE_TEXT;

        // Invisible hit area: gives each row one large, focusable target.
        row.append("rect")
            .attr("class", "dumbbell-hit")
            .attr("x", -margin.left + 8).attr("y", -3)
            .attr("width", margin.left + plotW + margin.right - 16)
            .attr("height", y.bandwidth() + 6)
            .attr("rx", 5)
            .attr("fill", "transparent")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", d =>
                `${d.state}: ${number(d.start)} hospitalisations in 2011 and ${number(d.end)} in 2021; ` +
                `${d.up ? "increase" : "decrease"} of ${signedPct(d.pct)}`
            )
            .on("mouseenter focus click", function (event, d) {
                d3.select(this).attr("fill", "#eef4fb");
                showTooltip(this.parentNode.querySelector(".dumbbell-line"), d);
            })
            .on("mouseleave blur", function () {
                d3.select(this).attr("fill", "transparent");
                hideTooltip();
            })
            .on("keydown", function (event) {
                if (event.key === "Escape") hideTooltip();
            });

        // State names (ACT is abbreviated in the compact layout only)
        row.append("text")
            .attr("x", -12).attr("y", mid + 5)
            .attr("text-anchor", "end")
            .attr("font-size", L.name).attr("fill", NAVY)
            .attr("pointer-events", "none")
            .text(d => (L.shortNames && SHORT[d.state]) || d.state);

        // Connecting line (solid = increase, dashed = decrease)
        row.append("line")
            .attr("class", "dumbbell-line")
            .attr("x1", d => x(Math.min(d.start, d.end)))
            .attr("x2", d => x(Math.max(d.start, d.end)))
            .attr("y1", mid).attr("y2", mid)
            .attr("stroke", colour)
            .attr("stroke-width", 4)
            .attr("stroke-linecap", "round")
            .attr("stroke-dasharray", d => d.up ? null : "8,5")
            .attr("pointer-events", "none");

        // Value labels: lower value to the left, higher value to the right,
        // so the two labels can never overlap each other.
        row.append("text")
            .attr("x", d => x(Math.min(d.start, d.end)) - 11)
            .attr("y", mid + 4.5)
            .attr("text-anchor", "end")
            .attr("font-size", L.value).attr("fill", GREY_TEXT)
            .attr("pointer-events", "none")
            .text(d => number(Math.min(d.start, d.end)));
        row.append("text")
            .attr("x", d => x(Math.max(d.start, d.end)) + 11)
            .attr("y", mid + 4.5)
            .attr("font-size", L.value).attr("fill", GREY_TEXT)
            .attr("pointer-events", "none")
            .text(d => number(Math.max(d.start, d.end)));

        // 2011 marker: hollow circle
        row.append("circle")
            .attr("cx", d => x(d.start)).attr("cy", mid).attr("r", 6)
            .attr("fill", "white").attr("stroke", GREY_TEXT).attr("stroke-width", 2.5)
            .attr("pointer-events", "none");

        // 2021 marker: filled diamond (drawn last so it stays visible if the two overlap)
        row.append("path")
            .attr("transform", d => `translate(${x(d.end)},${mid})`)
            .attr("d", d3.symbol().type(d3.symbolDiamond).size(150))
            .attr("fill", colour)
            .attr("stroke", "white").attr("stroke-width", 1.5)
            .attr("pointer-events", "none");

        // Direction in text: arrow + signed percentage change
        row.append("text")
            .attr("x", plotW + 14).attr("y", mid + 5)
            .attr("font-size", L.pct).attr("font-weight", "bold")
            .attr("fill", textColour)
            .attr("pointer-events", "none")
            .text(d => `${d.up ? "▲" : "▼"} ${signedPct(d.pct)}`);

        // Legend
        const lx = L.legendX;
        const legend = svg.append("g")
            .attr("transform", `translate(${L.shortNames ? 12 : margin.left + 20},${H - 12})`)
            .attr("aria-hidden", "true");

        legend.append("circle").attr("cx", lx[0] + 7).attr("cy", 0).attr("r", 6)
            .attr("fill", "white").attr("stroke", GREY_TEXT).attr("stroke-width", 2.5);
        legend.append("text").attr("x", lx[0] + 20).attr("y", 4).attr("font-size", L.legend)
            .attr("fill", GREY_TEXT).text("2011");

        legend.append("path").attr("transform", `translate(${lx[1]},0)`)
            .attr("d", d3.symbol().type(d3.symbolDiamond).size(150))
            .attr("fill", GREY_TEXT);
        legend.append("text").attr("x", lx[1] + 14).attr("y", 4).attr("font-size", L.legend)
            .attr("fill", GREY_TEXT).text("2021");

        legend.append("line").attr("x1", lx[2]).attr("x2", lx[2] + 30)
            .attr("stroke", BLUE).attr("stroke-width", 4).attr("stroke-linecap", "round");
        legend.append("text").attr("x", lx[2] + 38).attr("y", 4).attr("font-size", L.legend)
            .attr("fill", GREY_TEXT).text("Increase");

        legend.append("line").attr("x1", lx[3]).attr("x2", lx[3] + 30)
            .attr("stroke", ORANGE).attr("stroke-width", 4)
            .attr("stroke-dasharray", "8,5").attr("stroke-linecap", "round");
        legend.append("text").attr("x", lx[3] + 38).attr("y", 4).attr("font-size", L.legend)
            .attr("fill", GREY_TEXT).text("Decrease");
    }

    // ---------- Data ----------
    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        year: +d.Year,
        breakdown: d.Breakdown.trim(),
        category: d.Category.trim(),
        count: +d.Hospitalisations
    }))
        .then(data => {
            const rows = data.filter(d => d.breakdown === "State Total");
            const start = new Map(rows.filter(d => d.year === 2011).map(d => [d.category, d.count]));
            const end = new Map(rows.filter(d => d.year === 2021).map(d => [d.category, d.count]));

            // Data check: all 8 states and territories must have both years.
            if (start.size !== 8 || end.size !== 8 ||
                [...end.keys()].some(s => !start.has(s)) ||
                [...start.values(), ...end.values()].some(v => !Number.isFinite(v))) {
                throw new Error("Expected 8 states and territories with valid 2011 and 2021 values");
            }

            // Sort from the highest 2021 count to the lowest, as in the bar chart.
            const pairs = [...end.entries()]
                .map(([state, e]) => {
                    const s = start.get(state);
                    return { state, start: s, end: e, pct: (e - s) / s * 100, up: e >= s };
                })
                .sort((a, b) => b.end - a.end);

            const decreased = pairs.filter(d => !d.up);
            const insight = decreased.length === 0
                ? "All 8 states and territories increased"
                : `${8 - decreased.length} of 8 increased; ` +
                  `${decreased.length === 1 ? "only " : ""}${decreased.map(d => d.state).join(", ")} decreased`;

            draw(pairs, insight);
            compactQuery.addEventListener("change", () => draw(pairs, insight));
        })
        .catch(error => failure(error.message));
})();