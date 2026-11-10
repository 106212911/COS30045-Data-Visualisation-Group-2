
/*
COS30045 Data Visualisation - Group 2
Road User Comparison (horizontal bar chart)
Developer: Lin Yan
Data Source: BITRE (2023), processed using KNIME

Question answered: Which road-user groups recorded the most hospitalisations
in a selected year?

Responsive layout: two chart layouts are drawn from the same code.
  - wide layout (screens 1000 px and above): long, shallow chart for the full-width panel
  - compact layout (smaller screens): taller chart so that all 12 category
    labels stay readable when the chart is scrolled horizontally

AI assistance: ChatGPT / Claude assisted with drafting and refining this D3
chart. The code was reviewed and tested by the contributor; values were
checked against the cleaned CSV.
*/

(() => {

    const container = d3.select("#road-user-chart");
    if (container.empty()) return;

    // Orange is used only for the highlighted (hovered / focused) bar.
    const BAR = "#2166ac";
    const HIGHLIGHT = "#c2410c";
    const format = d3.format(",");

    // Layouts: viewBox size and margins
    const LAYOUTS = {
        wide: {
            width: 1700, height: 370,
            margin: { top: 14, right: 100, bottom: 62, left: 290 },
            labelSize: 16, tickSize: 14, valueSize: 15, axisTitleSize: 15
        },
        compact: {
            width: 760, height: 470,
            margin: { top: 12, right: 64, bottom: 58, left: 250 },
            labelSize: 14, tickSize: 13, valueSize: 14, axisTitleSize: 14
        }
    };

    const compactQuery = window.matchMedia("(max-width: 999px)");

    // Tooltip
    const tooltip = container
        .append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip");

    function placeTooltip(x, y) {
        // Keep the tooltip inside the chart container.
        const box = container.node().getBoundingClientRect();
        const tipW = tooltip.node().offsetWidth;
        const tipH = tooltip.node().offsetHeight;
        const safeX = Math.max(tipW / 2 + 4, Math.min(box.width - tipW / 2 - 4, x));
        const showBelow = y - 8 < tipH;

        tooltip
            .style("left", `${safeX}px`)
            .style("top", `${showBelow ? y + 18 : y - 8}px`)
            .style("transform", showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)");
    }

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {

            // 1. National Road User records only
            const roadUserData = data.filter(d => d.Breakdown === "National Road User");

            // Data check: 12 categories x 11 years
            if (roadUserData.length !== 132) {
                throw new Error(`Expected 132 road user records, found ${roadUserData.length}`);
            }

            // 2. Year dropdown
            const years = Array.from(new Set(roadUserData.map(d => d.Year)))
                .sort((a, b) => a - b);

            const yearSelect = d3.select("#road-user-year");

            yearSelect.selectAll("option")
                .data(years)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            yearSelect.property("value", 2021);

            // 3. Draw the chart for the current screen size
            let draw = () => { };

            function build() {
                const L = compactQuery.matches ? LAYOUTS.compact : LAYOUTS.wide;
                const chartWidth = L.width - L.margin.left - L.margin.right;
                const chartHeight = L.height - L.margin.top - L.margin.bottom;

                container.select("svg").remove();
                tooltip.style("visibility", "hidden");

                const svg = container
                    .insert("svg", ".chart-tooltip")
                    .attr("viewBox", `0 0 ${L.width} ${L.height}`)
                    .attr("role", "group")
                    .attr("aria-label",
                        "Horizontal bar chart comparing road crash hospitalisation counts across 12 road user categories in Australia");

                const chart = svg.append("g")
                    .attr("transform", `translate(${L.margin.left},${L.margin.top})`);

                const xScale = d3.scaleLinear().range([0, chartWidth]);
                const yScale = d3.scaleBand().range([0, chartHeight]).padding(0.22);

                const xAxis = chart.append("g")
                    .attr("transform", `translate(0,${chartHeight})`);
                const yAxis = chart.append("g");

                chart.append("text")
                    .attr("class", "axis-label")
                    .attr("x", chartWidth / 2)
                    .attr("y", chartHeight + L.margin.bottom - 10)
                    .attr("text-anchor", "middle")
                    .attr("font-size", L.axisTitleSize)
                    .text("Number of hospitalisations");

                function updateChart(selectedYear, animate) {
                    const duration = animate ? 500 : 0;

                    // Selected year, sorted from the highest to the lowest count
                    const yearData = roadUserData
                        .filter(d => d.Year === +selectedYear)
                        .sort((a, b) => b.Hospitalisations - a.Hospitalisations);

                    if (yearData.length !== 12) {
                        throw new Error(`Expected 12 categories for ${selectedYear}, found ${yearData.length}`);
                    }

                    xScale.domain([0, d3.max(yearData, d => d.Hospitalisations)]).nice();
                    yScale.domain(yearData.map(d => d.Category));

                    xAxis.transition().duration(duration)
                        .call(d3.axisBottom(xScale)
                            .ticks(compactQuery.matches ? 5 : 7)
                            .tickFormat(format))
                        .selectAll("text")
                        .style("font-size", `${L.tickSize}px`);

                    yAxis.transition().duration(duration)
                        .call(d3.axisLeft(yScale))
                        .selectAll("text")
                        .style("font-size", `${L.labelSize}px`);

                    // Bars
                    const bars = chart.selectAll(".road-user-bar")
                        .data(yearData, d => d.Category);

                    bars.exit().remove();

                    const newBars = bars.enter()
                        .append("rect")
                        .attr("class", "road-user-bar")
                        .attr("x", 0)
                        .attr("width", 0)
                        .attr("y", d => yScale(d.Category))
                        .attr("height", yScale.bandwidth())
                        .attr("fill", BAR)
                        .attr("rx", 4);

                    const allBars = newBars.merge(bars);

                    allBars.transition().duration(duration)
                        .attr("y", d => yScale(d.Category))
                        .attr("height", yScale.bandwidth())
                        .attr("width", d => xScale(d.Hospitalisations));

                    // Value labels
                    const labels = chart.selectAll(".road-user-label")
                        .data(yearData, d => d.Category);

                    labels.exit().remove();

                    labels.enter()
                        .append("text")
                        .attr("class", "road-user-label")
                        .attr("pointer-events", "none")
                        .merge(labels)
                        .text(d => format(d.Hospitalisations))
                        .transition().duration(duration)
                        .attr("x", d => xScale(d.Hospitalisations) + 8)
                        .attr("y", d => yScale(d.Category) + yScale.bandwidth() / 2)
                        .attr("dy", "0.35em")
                        .attr("font-size", L.valueSize)
                        .attr("fill", "#333");

                    // Tooltip, hover highlight and keyboard focus
                    allBars
                        .attr("tabindex", 0)
                        .attr("aria-label", d =>
                            `${d.Category}: ${format(d.Hospitalisations)} hospitalisations in ${d.Year}`)
                        .on("mouseenter focus", function (event, d) {
                            tooltip
                                .html(
                                    `<strong>${d.Category}</strong><br>` +
                                    `Year: ${d.Year}<br>` +
                                    `Hospitalisations: ${format(d.Hospitalisations)}`
                                )
                                .style("visibility", "visible");

                            d3.select(this).attr("fill", HIGHLIGHT);

                            // Mouse: follow the pointer. Keyboard focus: use the bar's position.
                            const box = container.node().getBoundingClientRect();
                            if (event.type === "focus") {
                                const r = this.getBoundingClientRect();
                                placeTooltip(r.left - box.left + Math.min(r.width, 160) / 2, r.top - box.top);
                            } else {
                                const [px, py] = d3.pointer(event, container.node());
                                placeTooltip(px, py);
                            }
                        })
                        .on("mousemove", function (event) {
                            const [px, py] = d3.pointer(event, container.node());
                            placeTooltip(px, py);
                        })
                        .on("mouseleave blur", function () {
                            tooltip.style("visibility", "hidden");
                            d3.select(this).attr("fill", BAR);
                        })
                        .on("keydown", function (event) {
                            if (event.key === "Escape") {
                                tooltip.style("visibility", "hidden");
                                d3.select(this).attr("fill", BAR);
                            }
                        });
                }

                draw = updateChart;
                updateChart(yearSelect.property("value") || 2021, false);
            }

            build();

            // 4. Year selection and screen-size changes
            yearSelect.on("change", function () {
                draw(this.value, true);
            });

            compactQuery.addEventListener("change", build);
        })
        .catch(error => {
            console.error("Error loading Road User data:", error);

            container.append("p")
                .attr("class", "error-message")
                .attr("role", "alert")
                .text("Unable to load the road user data. Please check the CSV file path.");
        });

})();