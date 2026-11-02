
/*
COS30045 Data Visualisation - Group 2
State & Territory Comparison
Developer: Lin Yan
Data Source: BITRE (2023), processed using KNIME
*/

// Run the chart inside its own scope
(() => {

    // 1. Set chart dimensions
    const margin = {
        top: 30,
        right: 100,
        bottom: 60,
        left: 260
    };

    const width = 1000;
    const height = 500;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // 2. Select the chart container
    const container = d3.select("#state-chart");

    // Create SVG
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "Horizontal bar chart comparing road crash hospitalisations across Australian states and territories"
        );

    // Create chart group
    const chart = svg.append("g")
        .attr("transform",
            `translate(${margin.left},${margin.top})`
        );

    // 3. Create tooltip
    const tooltip = container
        .append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip");

    // 4. Load cleaned CSV data
    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {

            // 5. Filter State Total records only
            const stateData = data.filter(d =>
                d.Breakdown === "State Total"
            );

            // Check whether the expected data was loaded
            if (stateData.length !== 88) {
                throw new Error(
                    `Expected 88 state records, found ${stateData.length}`
                );
            }

            console.table(stateData);

            // 6. Get available years
            const years = Array.from(
                new Set(stateData.map(d => d.Year))
            ).sort((a, b) => a - b);

            // 7. Create year dropdown
            const yearSelect = d3.select("#state-year");

            yearSelect.selectAll("option")
                .data(years)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            // Set default year
            yearSelect.property("value", 2021);

            // 8. Create scales
            const xScale = d3.scaleLinear()
                .range([0, chartWidth]);

            const yScale = d3.scaleBand()
                .range([0, chartHeight])
                .padding(0.25);

            // 9. Create axis groups
            const xAxis = chart.append("g")
                .attr("transform",
                    `translate(0,${chartHeight})`
                );

            const yAxis = chart.append("g");

            // X-axis label
            chart.append("text")
                .attr("class", "axis-label")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + 48)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Number of Hospitalisations");

            // Chart title
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .attr("font-size", "18px")
                .attr("font-weight", "bold")
                .attr("fill", "#16324f")
                .text("Hospitalisations by State and Territory");

            // 10. Function to update the chart
            function updateChart(selectedYear) {

                // Filter data for selected year
                const yearData = stateData
                    .filter(d => d.Year === +selectedYear)
                    .sort((a, b) =>
                        b.Hospitalisations - a.Hospitalisations
                    );

                // Check for 8 categories
                if (yearData.length !== 8) {
                    throw new Error(
                        `Expected 8 categories for ${selectedYear}, found ${yearData.length}`
                    );
                }

                // Update scale domains
                xScale.domain([
                    0,
                    d3.max(yearData, d => d.Hospitalisations)
                ]).nice();

                yScale.domain(
                    yearData.map(d => d.Category)
                );

                // Update X-axis
                xAxis
                    .transition()
                    .duration(500)
                    .call(
                        d3.axisBottom(xScale)
                            .ticks(6)
                            .tickFormat(d3.format(","))
                    );

                // Update Y-axis
                yAxis
                    .transition()
                    .duration(500)
                    .call(d3.axisLeft(yScale));

                // 11. Draw horizontal bars
                const bars = chart.selectAll(".state-bar")
                    .data(yearData, d => d.Category);

                // Remove bars that are no longer needed
                bars.exit()
                    .transition()
                    .duration(300)
                    .attr("width", 0)
                    .remove();

                // Add new bars
                const newBars = bars.enter()
                    .append("rect")
                    .attr("class", "state-bar")
                    .attr("x", 0)
                    .attr("width", 0)
                    .attr("y", d => yScale(d.Category))
                    .attr("height", yScale.bandwidth())
                    .attr("fill", "#2166ac")
                    .attr("rx", 4);

                // Update existing and new bars
                newBars.merge(bars)
                    .transition()
                    .duration(500)
                    .attr("y", d => yScale(d.Category))
                    .attr("height", yScale.bandwidth())
                    .attr("width", d =>
                        xScale(d.Hospitalisations)
                    );

                // 12. Add value labels
                const labels = chart.selectAll(".state-label")
                    .data(yearData, d => d.Category);

                labels.exit().remove();

                labels.enter()
                    .append("text")
                    .attr("class", "state-label")
                    .merge(labels)
                    .transition()
                    .duration(500)
                    .attr("x", d =>
                        xScale(d.Hospitalisations) + 8
                    )
                    .attr("y", d =>
                        yScale(d.Category) + yScale.bandwidth() / 2
                    )
                    .attr("dy", "0.35em")
                    .attr("font-size", "13px")
                    .attr("fill", "#333")
                    .text(d =>
                        d3.format(",")(d.Hospitalisations)
                    );

                // 13. Add tooltip interaction
                chart.selectAll(".state-bar")
                    .attr("tabindex", 0)
                    .attr("aria-label", d =>
                        `${d.Category}: ${d3.format(",")(d.Hospitalisations)} hospitalisations in ${d.Year}`
                    )
                    .on("mouseenter focus", function(event, d) {

                        tooltip
                            .html(
                                `<strong>${d.Category}</strong><br>` +
                                `Year: ${d.Year}<br>` +
                                `Hospitalisations: ${d3.format(",")(d.Hospitalisations)}`
                            )
                            .style("visibility", "visible");

                        d3.select(this)
                            .attr("fill", "#c2410c");

                        const [x, y] = d3.pointer(
                            event,
                            container.node()
                        );

                        tooltip
                            .style("left", `${x}px`)
                            .style("top", `${y}px`);
                    })
                    .on("mousemove", function(event) {

                        const [x, y] = d3.pointer(
                            event,
                            container.node()
                        );

                        tooltip
                            .style("left", `${x}px`)
                            .style("top", `${y}px`);
                    })
                    .on("mouseleave blur", function() {

                        tooltip.style("visibility", "hidden");

                        d3.select(this)
                            .attr("fill", "#2166ac");
                    });
            }

            // 14. Display the default year (2021)
            updateChart(2021);

            // 15. Update chart when the year changes
            yearSelect.on("change", function() {
                updateChart(this.value);
            });

        })

        // Display error if CSV cannot be loaded
        .catch(error => {
            console.error(
                "Error loading State & Territory data:",
                error
            );

            container.append("p")
                .attr("class", "error-message")
                .text(
                    "Unable to load the state and territory data. Please check the CSV file path."
                );
        });

})();
