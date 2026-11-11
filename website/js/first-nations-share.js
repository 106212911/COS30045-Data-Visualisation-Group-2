/*
COS30045 Data Visualisation - Group 2
First Nations Share of Hospitalisations (2011-2021) - Lollipop chart
Dayaanan
Data Source: BITRE, processed using KNIME
AI Assistance for reviewing and drafting


*/

(() => {

    const margin = {
        top: 34,
        right: 25,
        bottom: 62,
        left: 75
    };

    // Same size as Chart 7 so it fits the card the same way
    const width = 900;
    const height = 260;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const FN = "First Nations peoples";
    const NON = "Non-Indigenous Australians";
    const COLOR = "#d95f02";          // same First Nations colour as Chart 7
    const fmt = d3.format(",");
    const pct = v => (v * 100).toFixed(1) + "%";

    const container = d3.select("#first-nations-share-chart");


    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "Lollipop chart of the First Nations share of road crash hospitalisations each year from 2011 to 2021. " +
            "Share is First Nations hospitalisations divided by First Nations plus Non-Indigenous hospitalisations in the same year. " +
            "It is not an injury rate."
        );

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = container.append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip");

    // Hide tooltip when clicking an empty part of the chart
    svg.on("click", function (event) {
        if (!event.target.classList.contains("data-point")) {
            tooltip.style("visibility", "hidden");
            chart.selectAll(".data-point")
                .attr("r", 7)
                .attr("stroke", "white");
        }
    });

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {

            const rows = data.filter(d => d.Breakdown === "Population Status");

            const fn = rows.filter(d => d.Category === FN).sort((a, b) => a.Year - b.Year);
            const non = rows.filter(d => d.Category === NON).sort((a, b) => a.Year - b.Year);

            // 11 years for each group
            if (fn.length !== 11 || non.length !== 11) {
                throw new Error(
                    `Expected 11 records per group, found ${fn.length} and ${non.length}`
                );
            }

            // One point per year
            const points = fn.map((f, i) => {
                const total = f.Hospitalisations + non[i].Hospitalisations;
                return {
                    year: f.Year,
                    fnCount: f.Hospitalisations,
                    total: total,
                    share: f.Hospitalisations / total
                };
            });

            // Scales (lollipops need a zero baseline)
            const xScale = d3.scalePoint()
                .domain(points.map(d => d.year))
                .range([0, chartWidth])
                .padding(0.5);

            const yScale = d3.scaleLinear()
                .domain([0, d3.max(points, d => d.share) * 1.2])
                .nice()
                .range([chartHeight, 0]);

            // Light gridlines
            chart.append("g")
                .selectAll("line")
                .data(yScale.ticks(5))
                .join("line")
                .attr("x1", 0).attr("x2", chartWidth)
                .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
                .attr("stroke", "#e5e7eb");

            // Axes
            chart.append("g")
                .attr("transform", `translate(0,${chartHeight})`)
                .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

            chart.append("g")
                .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")));

            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + 50)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Year");

            // Short label so it fits the height of the chart
            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -chartHeight / 2)
                .attr("y", -55)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("First Nations share (%)");

            // Stems
            chart.selectAll(".stem")
                .data(points)
                .join("line")
                .attr("class", "stem")
                .attr("x1", d => xScale(d.year))
                .attr("x2", d => xScale(d.year))
                .attr("y1", yScale(0))
                .attr("y2", d => yScale(d.share))
                .attr("stroke", COLOR)
                .attr("stroke-width", 3);

            // Tooltip handlers
            function showTooltip(event, d) {
                const point = event.currentTarget;
                const pointRect = point.getBoundingClientRect();
                const containerRect = container.node().getBoundingClientRect();

                // Set the content first so the tooltip can be measured
                tooltip
                    .html(
                        `<strong>${d.year}</strong><br>` +
                        `First Nations share: ${pct(d.share)}<br>` +
                        `First Nations hospitalisations: ${fmt(d.fnCount)}<br>` +
                        `Both groups combined: ${fmt(d.total)}`
                    )
                    .style("visibility", "visible");

                const tipW = tooltip.node().offsetWidth;
                const tipH = tooltip.node().offsetHeight;

                let x = pointRect.left + pointRect.width / 2 - containerRect.left;
                let y = pointRect.top - containerRect.top - 10;
                let transform = "translate(-50%, -100%)";

                // Not enough room above the point: show the tooltip below it
                if (y - tipH < 0) {
                    y = pointRect.bottom - containerRect.top + 10;
                    transform = "translate(-50%, 0)";
                }

                // Keep the tooltip inside the left and right edges
                x = Math.max(tipW / 2, Math.min(containerRect.width - tipW / 2, x));

                tooltip
                    .style("left", `${x}px`)
                    .style("top", `${y}px`)
                    .style("transform", transform);

                // Bigger head with a dark outline so the focused point is easy to see
                d3.select(point)
                    .attr("r", 10)
                    .attr("stroke", "#000");
            }

            function hideTooltip(event) {
                tooltip.style("visibility", "hidden");
                d3.select(event.currentTarget)
                    .attr("r", 7)
                    .attr("stroke", "white");
            }

            // Keyboard: Left/Right move between years, Esc closes the tooltip.
            // Only one point is a tab stop.
            function moveFocus(event) {
                const nodes = chart.selectAll(".data-point").nodes();
                const i = nodes.indexOf(event.currentTarget);
                let target = null;

                if (event.key === "ArrowRight") target = nodes[i + 1];
                else if (event.key === "ArrowLeft") target = nodes[i - 1];
                else if (event.key === "Escape") {
                    hideTooltip(event);
                    event.currentTarget.blur();
                    return;
                } else return;

                if (target) {
                    event.preventDefault();
                    nodes.forEach(n => n.setAttribute("tabindex", -1));
                    target.setAttribute("tabindex", 0);
                    target.focus();
                }
            }

            // Lollipop heads
            chart.selectAll(".data-point")
                .data(points)
                .join("circle")
                .attr("class", "data-point")
                .attr("role", "img")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.share))
                .attr("r", 7)
                .attr("fill", COLOR)
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .attr("tabindex", 0)
                .attr("aria-label", d =>
                    `${d.year}: First Nations peoples were ${pct(d.share)} of hospitalisations ` +
                    `(${fmt(d.fnCount)} of ${fmt(d.total)})`
                )
                .on("mouseenter focus", showTooltip)
                .on("mouseleave blur", hideTooltip)
                .on("click", showTooltip)
                .on("keydown", moveFocus);

            // Percentage labels above each head
            chart.selectAll(".share-label")
                .data(points)
                .join("text")
                .attr("class", "share-label")
                .attr("aria-hidden", "true")
                .attr("x", d => xScale(d.year))
                .attr("y", d => yScale(d.share) - 14)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("font-weight", "bold")
                .text(d => pct(d.share));
        })
        .catch(error => {
            console.error("Error loading First Nations share data:", error);

            container
                .append("p")
                .attr("role", "alert")
                .text("Unable to load the First Nations share data.");
        });
})();