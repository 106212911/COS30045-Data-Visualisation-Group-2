/*
COS30045 Data Visualisation - Group 2
Road User Changes: 2011 vs 2021 (Slope Chart)
Contributor: Lai Man Yee
Data Source: BITRE (2023), processed using KNIME

Generative AI assistance:
ChatGPT assisted with developing and refining the D3.js slope chart.
Prompts focused on comparing hospitalisations in 2011 and 2021,
selecting the five leading road-user categories in 2021,
calculating percentage changes, adding direct labels, tooltips,
colour-blind-friendly line styles and keyboard accessibility.

The code and displayed values were reviewed and tested by the contributor.
*/

(() => {
    const selector = "#road-user-slope-chart";
    const container = d3.select(selector);
    if (container.empty()) return;

    const W = 900;
    const H = 340;
    const x2011 = 305;
    const x2021 = 675;
    const blue = "#0072B2";
    const orange = "#D55E00";
    const orangeText = "#9C3C00"; // Darker text passes normal-size contrast checks
    const number = d3.format(",");
    const signed = n => (n > 0 ? "+" : "") + n.toFixed(1) + "%";


    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "group")
        .attr("aria-label", "Road-user hospitalisation counts: 2011 versus 2021")
        .attr("aria-describedby", "slope-desc");

    const description = svg.append("desc")
        .attr("id", "slope-desc");


    const tooltip = container.append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip");

    const hideTooltip = () => tooltip.style("visibility", "hidden");

    function showTooltip(event, d) {
        const containerRect = container.node().getBoundingClientRect();
        const pointRect = event.currentTarget.getBoundingClientRect();
        const delta = d.end - d.start;
        tooltip.html(
            `<strong>${d.category}</strong><br>` +
            `2011: ${number(d.start)}<br>` +
            `2021: ${number(d.end)}<br>` +
            `Change: ${delta >= 0 ? "+" : ""}${number(delta)} (${signed(d.pct)})`
        );
        tooltip
            .style("left", `${pointRect.left - containerRect.left + pointRect.width / 2}px`)
            .style("top", `${pointRect.top - containerRect.top - 8}px`)
            .style("visibility", "visible");
    }

    function failure(message) {
        console.error("Road User Slope Chart:", message);
        container.append("p")
            .attr("role", "alert")
            .style("font-size", "14px")
            .text("Unable to display the Road User Slope Chart. Check the data file.");
    }

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        year: +d.Year,
        breakdown: d.Breakdown.trim(),
        category: d.Category.trim(),
        count: +d.Hospitalisations
    }))
        .then(data => {
            const rows = data.filter(d => d.breakdown === "National Road User");
            const left = new Map(rows.filter(d => d.year === 2011).map(d => [d.category, d.count]));
            const right = rows.filter(d => d.year === 2021)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            if (right.length !== 5 || right.some(d =>
                !left.has(d.category) ||
                !Number.isFinite(left.get(d.category)) ||
                !Number.isFinite(d.count))) {
                throw new Error("Missing or invalid 2011/2021 road-user values");
            }

            // Select the five largest categories in 2021, then compare with 2011.
            const pairs = right.map(d => {
                const start = left.get(d.category);
                const end = d.count;
                return {
                    category: d.category, start, end,
                    pct: (end - start) / start * 100
                };
            });

            description.text(
                "Slope chart comparing the five largest road-user categories in 2021 " +
                "with their counts in 2011. " + pairs.map(d =>
                    `${d.category}: ${number(d.start)} in 2011 and ${number(d.end)} in 2021.`
                ).join(" ") + " Values are counts, not injury rates."
            );

            const maxCount = d3.max(pairs, d => Math.max(d.start, d.end));
            const y = d3.scaleLinear()
                .domain([0, maxCount * 1.12])
                .range([292, 58]);

            // Keep end labels readable if nearby categories have similar values.
            function labelPositions(field) {
                const placed = new Map();
                let previous = -Infinity;
                [...pairs].sort((a, b) => b[field] - a[field]).forEach(d => {
                    const position = Math.max(y(d[field]), previous + 23);
                    placed.set(d.category, position);
                    previous = position;
                });
                return placed;
            }
            const leftLabels = labelPositions("start");
            const rightLabels = labelPositions("end");

            svg.append("text")
                .attr("x", 18).attr("y", 22)
                .attr("font-size", 14).attr("fill", "#374151")
                .text("Five largest road-user categories in 2021 · Hospitalisations (counts)");

            [
                { x: x2011, label: "2011" },
                { x: x2021, label: "2021" }
            ].forEach(d => {
                svg.append("text")
                    .attr("x", d.x).attr("y", 47)
                    .attr("text-anchor", "middle")
                    .attr("font-weight", "bold").attr("font-size", 17)
                    .attr("fill", "#16324f").text(d.label);
                svg.append("line")
                    .attr("x1", d.x).attr("x2", d.x)
                    .attr("y1", 55).attr("y2", 301)
                    .attr("stroke", "#dde3ea").attr("stroke-dasharray", "3,5");
            });

            const groups = svg.selectAll(".slope-series")
                .data(pairs)
                .join("g")
                .attr("class", "slope-series");

            groups.append("line")
                .attr("x1", x2011).attr("x2", x2021)
                .attr("y1", d => y(d.start))
                .attr("y2", d => y(d.end))
                .attr("stroke", d => d.end >= d.start ? blue : orange)
                .attr("stroke-width", 3.5)
                .attr("stroke-dasharray", d => d.end >= d.start ? null : "8,5")
                .attr("stroke-linecap", "round")
                .attr("aria-hidden", "true");

            // Fine guide lines connect displaced labels to their exact data points.
            groups.append("line")
                .attr("x1", x2011 - 2).attr("x2", x2011 - 17)
                .attr("y1", d => y(d.start))
                .attr("y2", d => leftLabels.get(d.category))
                .attr("stroke", "#9ca3af");
            groups.append("line")
                .attr("x1", x2021 + 2).attr("x2", x2021 + 17)
                .attr("y1", d => y(d.end))
                .attr("y2", d => rightLabels.get(d.category))
                .attr("stroke", "#9ca3af");

            groups.append("text")
                .attr("x", x2011 - 22)
                .attr("y", d => leftLabels.get(d.category) + 5)
                .attr("text-anchor", "end")
                .attr("font-size", 14).attr("fill", "#16324f")
                .text(d => `${d.category}: ${number(d.start)}`);

            groups.append("text")
                .attr("x", x2021 + 22)
                .attr("y", d => rightLabels.get(d.category) + 5)
                .attr("font-size", 14)
                .attr("font-weight", "bold")
                .attr("fill", d => d.end >= d.start ? blue : orangeText)
                .text(d => `${number(d.end)} (${signed(d.pct)})`);

            // Each endpoint can be focused with Tab as well as hovered or tapped.
            [
                { year: 2011, x: x2011, field: "start" },
                { year: 2021, x: x2021, field: "end" }
            ].forEach(endpoint => {
                groups.append("circle")
                    .attr("class", "slope-point")
                    .attr("cx", endpoint.x)
                    .attr("cy", d => y(d[endpoint.field]))
                    .attr("r", 7)
                    .attr("fill", d => d.end >= d.start ? blue : orange)
                    .attr("stroke", "white")
                    .attr("stroke-width", 2)
                    .attr("tabindex", 0)
                    .attr("role", "button")
                    .attr("aria-label", d =>
                        `${d.category}: ${number(d[endpoint.field])} hospitalisations in ${endpoint.year}; ` +
                        `${signed(d.pct)} change between 2011 and 2021`
                    )
                    .on("mouseenter focus click", showTooltip)
                    .on("mouseleave blur", hideTooltip)
                    .on("keydown", (event, d) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            showTooltip(event, d);
                        }
                        if (event.key === "Escape") hideTooltip();
                    });
            });

            const legend = svg.append("g").attr("transform", "translate(220,325)");
            legend.append("line")
                .attr("x1", 0).attr("x2", 30).attr("stroke", blue)
                .attr("stroke-width", 3.5);
            legend.append("text")
                .attr("x", 38).attr("y", 5).attr("font-size", 13)
                .text("Increase");
            legend.append("line")
                .attr("x1", 165).attr("x2", 195).attr("stroke", orange)
                .attr("stroke-dasharray", "8,5").attr("stroke-width", 3.5);
            legend.append("text")
                .attr("x", 203).attr("y", 5).attr("font-size", 13)
                .text("Decrease");
        })
        .catch(error => failure(error.message));
})();
