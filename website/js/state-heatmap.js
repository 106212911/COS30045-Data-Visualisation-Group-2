
/*
COS30045 Group 2 - State & Territory Heatmap
Data: BITRE hospitalisation counts, cleaned with KNIME
AI assistance: ChatGPT helped draft the D3 heatmap,
data loading, layout, tooltip and interaction code.
*/

(() => {
    const container = d3.select("#state-chart");
    if (container.empty()) return;

    container.selectAll("*").remove();


    const width = 900;
    const height = 260;

    const margin = {
        top: 15,
        right: 20,
        bottom: 40,
        left: 180
    };


    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "Heatmap of annual hospitalisations across Australian states and territories from 2011 to 2021");

    const chart = svg.append("g")
        .attr("transform",
            `translate(${margin.left},${margin.top})`);

    const tooltip = container.append("div")
        .attr("class", "chart-tooltip");

    const format = d3.format(",");

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {
            const rows = data.filter(d =>
                d.Breakdown === "State Total"
            );

            if (rows.length !== 88) {
                throw new Error("Expected 88 state-year records");
            }

            const years = [...new Set(rows.map(d => d.Year))]
                .sort((a, b) => a - b);

            const states = [...new Set(rows.map(d => d.Category))]
                .sort();

            const x = d3.scaleBand()
                .domain(years)
                .range([0, chartWidth])
                .padding(0.06);

            const y = d3.scaleBand()
                .domain(states)
                .range([0, chartHeight])
                .padding(0.08);

            const color = d3.scaleSequential(d3.interpolateBlues)
                .domain([0, d3.max(rows, d => d.Hospitalisations)]);

            // Show the highest count represented by the colour scale
            const maxCount = d3.max(
                rows,
                d => d.Hospitalisations
            );

            d3.select("#state-max-count")
                .text(d3.format(",")(maxCount));

            chart.append("g")
                .attr("transform",
                    `translate(0,${chartHeight})`)
                .call(
                    d3.axisBottom(x)
                        .tickSize(0)
                        .tickFormat(d3.format("d"))
                )
                .select(".domain").remove();

            chart.append("g")
                .call(d3.axisLeft(y).tickSize(0))
                .select(".domain").remove();

            chart.selectAll(".heat-cell")
                .data(rows)
                .join("rect")
                .attr("class", "heat-cell")
                .attr("x", d => x(d.Year))
                .attr("y", d => y(d.Category))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .attr("rx", 3)
                .attr("fill", d => color(d.Hospitalisations))
                .attr("tabindex", 0)
                .attr("aria-label", d =>
                    `${d.Category}, ${d.Year}, ${format(d.Hospitalisations)} hospitalisations`
                )
                .on("mouseenter focus click", function (event, d) {
                    const rect = this.getBoundingClientRect();
                    const parent = container.node()
                        .getBoundingClientRect();

                    tooltip
                        .text(
                            `${d.Category} | ${d.Year}: ${format(d.Hospitalisations)} hospitalisations`
                        )
                        .style("visibility", "visible");

                    const tipWidth = tooltip.node().offsetWidth;
                    const tipHeight = tooltip.node().offsetHeight;

                    const centreX = rect.left + rect.width / 2
                        - parent.left;

                    const safeX = Math.max(
                        tipWidth / 2 + 4,
                        Math.min(
                            parent.width - tipWidth / 2 - 4,
                            centreX
                        )
                    );

                    const top = rect.top - parent.top - 8;
                    const showBelow = top < tipHeight;

                    tooltip
                        .style("left", `${safeX}px`)
                        .style("top",
                            `${showBelow
                                ? rect.bottom - parent.top + 8
                                : top}px`)
                        .style("transform",
                            showBelow
                                ? "translate(-50%, 0)"
                                : "translate(-50%, -100%)");

                    d3.select(this)
                        .attr("stroke", "#d97706")
                        .attr("stroke-width", 3);
                })
                .on("mouseleave blur", function () {
                    tooltip.style("visibility", "hidden");
                    d3.select(this).attr("stroke", "none");
                })
                .on("keydown", function (event) {
                    if (event.key === "Escape") {
                        tooltip.style("visibility", "hidden");
                        this.blur();
                    }
                });
        })
        .catch(error => {
            console.error("State heatmap error:", error);
            container.append("p")
                .text("Unable to load state data.");
        });
})();
