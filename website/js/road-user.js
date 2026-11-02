
/*
COS30045 Data Visualisation - Group 2
Road User Comparison
Developer: Lin Yan
Data Source: BITRE (2023), processed using KNIME
*/

(() => {

    // 1. Set chart dimensions
    const margin = {
        top: 40,
        right: 100,
        bottom: 65,
        left: 300
    };

    const width = 1100;
    const height = 680;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // 2. Select the chart container
    const container = d3.select("#road-user-chart");

    // Create SVG
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "Horizontal bar chart comparing road crash hospitalisations across road user categories in Australia"
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

            // 5. Filter National Road User records only
            const roadUserData = data.filter(d =>
                d.Breakdown === "National Road User"
            );

            // Check whether the expected data was loaded
            if (roadUserData.length !== 132) {
                throw new Error(
                    `Expected 132 road user records, found ${roadUserData.length}`
                );
            }

            console.table(roadUserData);

            // 6. Get available years
            const years = Array.from(
                new Set(roadUserData.map(d => d.Year))
            ).sort((a, b) => a - b);

            // 7. Create year dropdown
            const yearSelect = d3.select("#road-user-year");

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
                .padding(0.2);

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
                .attr("y", chartHeight + 50)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Number of Hospitalisations");

            // Chart title
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", -15)
                .attr("text-anchor", "middle")
                .attr("font-size", "18px")
                .attr("font-weight", "bold")
                .attr("fill", "#16324f")
                .text("Hospitalisations by Road User Type");

            // 10. Function to update the chart
            function updateChart(selectedYear) {

                // Filter data for selected year
                const yearData = roadUserData
                    .filter(d => d.Year === +selectedYear)
                    .sort((a, b) =>
                        b.Hospitalisations - a.Hospitalisations
                    );

                // Check for 12 categories
                if (yearData.length !== 12) {
                    throw new Error(
                        `Expected 12 categories for ${selectedYear}, found ${yearData.length}`
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
                    .call(d3.axisLeft(yScale))
                    .selectAll("text")
                    .style("font-size", "11px");

                // 11. Draw horizontal bars
                const bars = chart.selectAll(".road-user-bar")
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
                    .attr("class", "road-user-bar")
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
                    )
                    .attr("fill", "#2166ac");

                // 12. Add value labels
                const labels = chart.selectAll(".road-user-label")
                    .data(yearData, d => d.Category);

                labels.exit().remove();

                labels.enter()
                    .append("text")
                    .attr("class", "road-user-label")
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
                    .attr("font-size", "12px")
                    .attr("fill", "#333")
                    .text(d =>
                        d3.format(",")(d.Hospitalisations)
                    );

                // 13. Add tooltip interaction
                chart.selectAll(".road-user-bar")
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
                "Error loading Road User data:",
                error
            );

            container.append("p")
                .attr("class", "error-message")
                .text(
                    "Unable to load the road user data. Please check the CSV file path."
                );
        });

})();
