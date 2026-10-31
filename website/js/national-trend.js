
/*
COS30045 Data Visualisation - Group 2
National Hospitalisation Trends (2011-2021)
Data Source: BITRE, processed using KNIME
*/

// Set chart dimensions and margins
(() => {
    const margin = { top: 40, right: 40, bottom: 70, left: 90 };
    const width = 900;
    const height = 450;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create responsive SVG
    const svg = d3.select("#national-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "Line chart of Australian road crash hospitalisations from 2011 to 2021"
        );

    // Create chart group
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Load the cleaned CSV exported from KNIME
    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {

            // Filter national total records only
            const nationalData = data
                .filter(d =>
                    d.Breakdown === "National Total" &&
                    d.Category === "Australia"
                )
                .sort((a, b) => a.Year - b.Year);

            console.table(nationalData);

            // Check that the expected records were loaded
            if (nationalData.length !== 11) {
                throw new Error(
                    `Expected 11 national records, found ${nationalData.length}`
                );
            }

            // X-axis scale: Year
            const xScale = d3.scaleLinear()
                .domain(d3.extent(nationalData, d => d.Year))
                .range([0, chartWidth]);

            // Y-axis scale: Hospitalisations
            const yScale = d3.scaleLinear()
                .domain([
                    0,
                    d3.max(nationalData, d => d.Hospitalisations)
                ])
                .nice()
                .range([chartHeight, 0]);

            // Add X-axis
            chart.append("g")
                .attr("transform", `translate(0,${chartHeight})`)
                .call(
                    d3.axisBottom(xScale)
                        .ticks(11)
                        .tickFormat(d3.format("d"))
                );

            // Add Y-axis
            chart.append("g")
                .call(
                    d3.axisLeft(yScale)
                        .ticks(8)
                        .tickFormat(d3.format(","))
                );

            // X-axis label
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + 50)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Year");

            // Y-axis label
            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -chartHeight / 2)
                .attr("y", -65)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Number of Hospitalisations");

            // Create line generator
            const line = d3.line()
                .x(d => xScale(d.Year))
                .y(d => yScale(d.Hospitalisations));

            // Draw trend line
            chart.append("path")
                .datum(nationalData)
                .attr("fill", "none")
                .attr("stroke", "#2166ac")
                .attr("stroke-width", 3)
                .attr("d", line);


            // Create tooltip
            const tooltip = d3.select("#national-chart")
                .append("div")
                .attr("class", "chart-tooltip")
                .attr("role", "tooltip");

            // Show tooltip when hovering or focusing on a point
            function showTooltip(event, d) {
                const point = event.currentTarget;
                const pointRect = point.getBoundingClientRect();
                const containerRect = document
                    .getElementById("national-chart")
                    .getBoundingClientRect();

                const x = pointRect.left + pointRect.width / 2
                    - containerRect.left;
                const y = pointRect.top - containerRect.top - 10;

                tooltip
                    .html(
                        `<strong>Year: ${d.Year}</strong><br>` +
                        `Hospitalisations: ${d3.format(",")(d.Hospitalisations)}`
                    )
                    .style("left", `${x}px`)
                    .style("top", `${y}px`)
                    .style("visibility", "visible");

                d3.select(point)
                    .attr("r", 8);
            }

            // Hide tooltip
            function hideTooltip(event) {
                tooltip.style("visibility", "hidden");

                d3.select(event.currentTarget)
                    .attr("r", 5);
            }

            // Add interactive circles at each year
            chart.selectAll(".data-point")
                .data(nationalData)
                .enter()
                .append("circle")
                .attr("class", "data-point")
                .attr("cx", d => xScale(d.Year))
                .attr("cy", d => yScale(d.Hospitalisations))
                .attr("r", 5)
                .attr("fill", "#2166ac")
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .attr("tabindex", 0)
                .attr("aria-label", d =>
                    `${d.Year}: ${d3.format(",")(d.Hospitalisations)} hospitalisations`
                )

                // Mouse and keyboard interaction
                .on("mouseenter focus", showTooltip)
                .on("mouseleave blur", hideTooltip)

                // Allow users to tap or click a point
                .on("click", showTooltip)

                // Allow keyboard users to dismiss the tooltip
                .on("keydown", function (event) {
                    if (event.key === "Escape") {
                        hideTooltip(event);
                        this.blur();
                    }
                });

            // Hide tooltip when clicking an empty part of the chart
            svg.on("click", function (event) {
                if (!event.target.classList.contains("data-point")) {
                    tooltip.style("visibility", "hidden");

                    chart.selectAll(".data-point")
                        .attr("r", 5);
                }
            });



            // Highlight the decline in 2020
            const data2019 = nationalData.find(d => d.Year === 2019);
            const data2020 = nationalData.find(d => d.Year === 2020);

            if (data2019 && data2020) {

                // Calculate percentage change
                const percentageChange =
                    ((data2020.Hospitalisations - data2019.Hospitalisations)
                        / data2019.Hospitalisations) * 100;

                const pointX = xScale(data2020.Year);
                const pointY = yScale(data2020.Hospitalisations);

                // Highlight the 2020 data point
                chart.selectAll(".data-point")
                    .filter(d => d.Year === 2020)
                    .attr("fill", "#c2410c");

                // Create an annotation group
                const annotation = chart.append("g")
                    .attr("class", "annotation")
                    .attr("aria-hidden", "true");

                const labelX = pointX - 175;
                const labelY = pointY + 60;

                // Connector line
                annotation.append("line")
                    .attr("x1", pointX)
                    .attr("y1", pointY + 8)
                    .attr("x2", labelX + 150)
                    .attr("y2", labelY)
                    .attr("stroke", "#c2410c")
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "4,3");

                // Annotation background
                annotation.append("rect")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .attr("width", 175)
                    .attr("height", 60)
                    .attr("rx", 6)
                    .attr("fill", "#fff7ed")
                    .attr("stroke", "#c2410c");

                // Annotation heading
                annotation.append("text")
                    .attr("x", labelX + 12)
                    .attr("y", labelY + 23)
                    .attr("font-size", "14px")
                    .attr("font-weight", "bold")
                    .attr("fill", "#9a3412")
                    .text("2020 decline");

                // Annotation explanation
                annotation.append("text")
                    .attr("x", labelX + 12)
                    .attr("y", labelY + 43)
                    .attr("font-size", "12px")
                    .attr("fill", "#9a3412")
                    .text(`${Math.abs(percentageChange).toFixed(1)}% lower than 2019`);
            }



        })
        .catch(error => {
            console.error("Error loading national data:", error);

            d3.select("#national-chart")
                .append("p")
                .attr("role", "alert")
                .text("Unable to load the national hospitalisation data.");
        });
})();