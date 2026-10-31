/*
COS30045 Data Visualisation - Group 2
First Nations Hospitalisation Trends (2011-2021)
Data Source: BITRE, processed using KNIME
*/

(() => {
    const margin = { top: 40, right: 40, bottom: 70, left: 90 };
    const width = 900;
    const height = 450;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const FN = "First Nations peoples";
    const NON = "Non-Indigenous Australians";
    const COLORS = { [FN]: "#d95f02", [NON]: "#2166ac" };
    const VIEWS = {
        fn: "First Nations only (counts)",
        both: "Both groups (counts)",
        index: "Growth since 2011 (2011 = 100)"
    };

    const container = d3.select("#first-nations-chart");

    // Responsive SVG
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "Line chart of road crash hospitalisations for First Nations peoples and Non-Indigenous Australians from 2011 to 2021"
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
            chart.selectAll(".data-point").attr("r", 5);
        }
    });

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {

            // Keep only the population status records
            const rows = data
                .filter(d => d.Breakdown === "Population Status")
                .sort((a, b) => a.Year - b.Year);

            console.table(rows);

            // 2 groups x 11 years
            if (rows.length !== 22) {
                throw new Error(
                    `Expected 22 population records, found ${rows.length}`
                );
            }

            const byGroup = d3.group(rows, d => d.Category);

            // Index each group against its own 2011 value (2011 = 100)
            byGroup.forEach(list => {
                const base = list[0].Hospitalisations;
                list.forEach(r => {
                    r.Index = (r.Hospitalisations / base) * 100;
                });
            });

            // View dropdown
            const select = d3.select("#fn-view");
            select.selectAll("option")
                .data(Object.entries(VIEWS))
                .join("option")
                .attr("value", d => d[0])
                .text(d => d[1]);
            select.on("change", function () { draw(this.value); });

            draw("fn");

            function draw(view) {
                chart.selectAll("*").remove();
                tooltip.style("visibility", "hidden");

                const isIndex = view === "index";
                const field = isIndex ? "Index" : "Hospitalisations";
                const names = view === "fn" ? [FN] : [FN, NON];
                const series = names.map(n => ({ name: n, values: byGroup.get(n) }));
                const all = series.flatMap(s => s.values);

                // Scales
                const xScale = d3.scaleLinear()
                    .domain(d3.extent(all, d => d.Year))
                    .range([0, chartWidth]);

                const yScale = d3.scaleLinear()
                    .domain([isIndex ? 80 : 0, d3.max(all, d => d[field]) * 1.08])
                    .nice()
                    .range([chartHeight, 0]);

                // Axes
                chart.append("g")
                    .attr("transform", `translate(0,${chartHeight})`)
                    .call(d3.axisBottom(xScale).ticks(11).tickFormat(d3.format("d")));

                chart.append("g")
                    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d3.format(",")));

                chart.append("text")
                    .attr("x", chartWidth / 2)
                    .attr("y", chartHeight + 50)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "15px")
                    .text("Year");

                chart.append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("x", -chartHeight / 2)
                    .attr("y", -65)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "15px")
                    .text(isIndex ? "Index (2011 = 100)" : "Number of Hospitalisations");

                // Reference line at 100 for the index view
                if (isIndex) {
                    chart.append("line")
                        .attr("x1", 0).attr("x2", chartWidth)
                        .attr("y1", yScale(100)).attr("y2", yScale(100))
                        .attr("stroke", "#888")
                        .attr("stroke-dasharray", "4,3");
                }

                // Trend lines
                const line = d3.line()
                    .x(d => xScale(d.Year))
                    .y(d => yScale(d[field]));

                series.forEach(s => {
                    chart.append("path")
                        .datum(s.values)
                        .attr("fill", "none")
                        .attr("stroke", COLORS[s.name])
                        .attr("stroke-width", 3)
                        .attr("d", line);
                });

                // Tooltip handlers
                function showTooltip(event, d) {
    const point = event.currentTarget;
    const pointRect = point.getBoundingClientRect();
    const containerRect = document
        .getElementById("first-nations-chart")
        .getBoundingClientRect();

    const indexLine = isIndex
        ? `<br>Index: ${d.Index.toFixed(1)}`
        : "";

    // Set the content first so the tooltip can be measured
    tooltip
        .html(
            `<strong>${d.Category}</strong><br>` +
            `Year: ${d.Year}<br>` +
            `Hospitalisations: ${d3.format(",")(d.Hospitalisations)}` +
            indexLine
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

    d3.select(point).attr("r", 8);
}

                function hideTooltip(event) {
                    tooltip.style("visibility", "hidden");
                    d3.select(event.currentTarget).attr("r", 5);
                }

                // Interactive points
                series.forEach(s => {
                    chart.selectAll(null)
                        .data(s.values)
                        .enter()
                        .append("circle")
                        .attr("class", "data-point")
                        .attr("cx", d => xScale(d.Year))
                        .attr("cy", d => yScale(d[field]))
                        .attr("r", 5)
                        .attr("fill", COLORS[s.name])
                        .attr("stroke", "white")
                        .attr("stroke-width", 2)
                        .attr("tabindex", 0)
                        .attr("aria-label", d =>
                            `${d.Category}, ${d.Year}: ${d3.format(",")(d.Hospitalisations)} hospitalisations`
                        )
                        .on("mouseenter focus", showTooltip)
                        .on("mouseleave blur", hideTooltip)
                        .on("click", showTooltip)
                        .on("keydown", function (event) {
                            if (event.key === "Escape") {
                                hideTooltip(event);
                                this.blur();
                            }
                        });
                });

                // Annotation: First Nations rise in 2020
                const fnValues = byGroup.get(FN);
                const d2019 = fnValues.find(d => d.Year === 2019);
                const d2020 = fnValues.find(d => d.Year === 2020);

                if (d2019 && d2020) {
                    const change =
                        ((d2020.Hospitalisations - d2019.Hospitalisations)
                            / d2019.Hospitalisations) * 100;

                    const pointX = xScale(d2020.Year);
                    const pointY = yScale(d2020[field]);

                    const labelX = pointX - 190;
                    const labelY = view === "fn" ? pointY + 95 : chartHeight * 0.45;

                    const annotation = chart.append("g")
                        .attr("class", "annotation")
                        .attr("aria-hidden", "true");

                    annotation.append("line")
                        .attr("x1", pointX)
                        .attr("y1", pointY + 8)
                        .attr("x2", labelX + 150)
                        .attr("y2", labelY)
                        .attr("stroke", "#c2410c")
                        .attr("stroke-width", 1.5)
                        .attr("stroke-dasharray", "4,3");

                    annotation.append("rect")
                        .attr("x", labelX)
                        .attr("y", labelY)
                        .attr("width", 175)
                        .attr("height", 60)
                        .attr("rx", 6)
                        .attr("fill", "#fff7ed")
                        .attr("stroke", "#c2410c");

                    annotation.append("text")
                        .attr("x", labelX + 12)
                        .attr("y", labelY + 23)
                        .attr("font-size", "14px")
                        .attr("font-weight", "bold")
                        .attr("fill", "#9a3412")
                        .text("2020 rise");

                    annotation.append("text")
                        .attr("x", labelX + 12)
                        .attr("y", labelY + 43)
                        .attr("font-size", "12px")
                        .attr("fill", "#9a3412")
                        .text(`${change.toFixed(1)}% higher than 2019`);
                }

                // Legend
                d3.select("#fn-legend")
                    .html("")
                    .selectAll("span")
                    .data(series)
                    .join("span")
                    .style("--c", d => COLORS[d.name])
                    .text(d => d.name);
            }
        })
        .catch(error => {
            console.error("Error loading First Nations data:", error);

            container
                .append("p")
                .attr("role", "alert")
                .text("Unable to load the First Nations hospitalisation data.");
        });
})();