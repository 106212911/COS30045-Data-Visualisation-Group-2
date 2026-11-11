/*
COS30045 Data Visualisation - Group 2
Road User Composition (2011-2021) - 100% stacked area chart
Dayaanan
Data Source: BITRE, processed using KNIME
AI Assistance for reviewing and drafting

Additional refinements - Lai Man Yee:
ChatGPT assisted with improving the layout and accessibility
of the Road User Composition chart.

Prompts focused on expanding the chart to fit the
full-width dashboard panel, improving separation between
stacked categories for colour-blind accessibility,
and adding keyboard navigation, focus indicators
and descriptive ARIA labels.

The refinements were manually tested in Microsoft Edge.

*/

(() => {


    const margin = {
        top: 15,
        right: 40,
        bottom: 62,
        left: 85
    };

    const width = 1700;
    const height = 260;


    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const OTHER = "All other road users";
    const fmt = d3.format(",");
    const pct = v => (v * 100).toFixed(1) + "%";

    // Colour-blind-safe colours (Okabe-Ito), grey for the combined group
    const PALETTE = ["#0072B2", "#E69F00", "#005C42", "#CC79A7", "#56B4E9"];
    const OTHER_COLOR = "#999999";

    const container = d3.select("#road-user-composition-chart");

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-label",
            "100% stacked area chart showing the share of road crash hospitalisations " +
            "by road user type from 2011 to 2021. Each year adds up to 100%. " +
            "It shows shares of counts, not injury rates."
        );

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = container.append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip");

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {

            const roadUserData = data.filter(d => d.Breakdown === "National Road User");

            // 12 categories x 11 years
            if (roadUserData.length !== 132) {
                throw new Error(
                    `Expected 132 road user records, found ${roadUserData.length}`
                );
            }

            const years = Array.from(new Set(roadUserData.map(d => d.Year)))
                .sort((a, b) => a - b);

            // Five biggest categories in 2021
            const top5 = roadUserData
                .filter(d => d.Year === 2021)
                .sort((a, b) => b.Hospitalisations - a.Hospitalisations)
                .slice(0, 5)
                .map(d => d.Category);

            const keys = [...top5, OTHER];

            const colorOf = {};
            top5.forEach((name, i) => { colorOf[name] = PALETTE[i]; });
            colorOf[OTHER] = OTHER_COLOR;

            // One row per year: count for each top category, the rest added into Other
            const rows = years.map(year => {
                const row = { year: year, total: 0 };
                row[OTHER] = 0;

                roadUserData
                    .filter(d => d.Year === year)
                    .forEach(d => {
                        if (top5.includes(d.Category)) {
                            row[d.Category] = d.Hospitalisations;
                        } else {
                            row[OTHER] += d.Hospitalisations;
                        }
                        row.total += d.Hospitalisations;
                    });

                return row;
            });

            // Stack the counts and scale each year to 100%
            const stacked = d3.stack()
                .keys(keys)
                .offset(d3.stackOffsetExpand)(rows);

            // Scales
            const xScale = d3.scaleLinear()
                .domain(d3.extent(years))
                .range([0, chartWidth]);

            const yScale = d3.scaleLinear()
                .domain([0, 1])
                .range([chartHeight, 0]);

            // Axes
            chart.append("g")
                .attr("transform", `translate(0,${chartHeight})`)
                .call(d3.axisBottom(xScale).ticks(years.length).tickFormat(d3.format("d")));

            chart.append("g")
                .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")));

            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + 50)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Year");

            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -chartHeight / 2)
                .attr("y", -55)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Share of hospitalisations");

            // Stacked areas
            const area = d3.area()
                .x(d => xScale(d.data.year))
                .y0(d => yScale(d[0]))
                .y1(d => yScale(d[1]));

            chart.selectAll(".composition-area")
                .data(stacked)
                .join("path")
                .attr("class", "composition-area")
                .attr("aria-hidden", "true")
                .attr("fill", d => colorOf[d.key])
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", 2)

                .attr("d", area);

            // Vertical line that marks the year being looked at
            const guide = chart.append("line")
                .attr("y1", 0)
                .attr("y2", chartHeight)
                .attr("stroke", "#111")
                .attr("stroke-width", 2)
                .attr("pointer-events", "none")
                .style("visibility", "hidden");

            // Text for one year, listed in the same order as the stack (top to bottom)
            function yearLines(row) {
                return [...keys].reverse().map(key => ({
                    name: key,
                    share: row[key] / row.total,
                    count: row[key]
                }));
            }

            function showTooltip(event, row) {
                const column = event.currentTarget;
                const colBox = column.getBoundingClientRect();
                const boxBox = container.node().getBoundingClientRect();

                const lines = yearLines(row)
                    .map(l =>
                        `<span style="color:${colorOf[l.name]}">&#9632;</span> ` +
                        `${l.name}: ${pct(l.share)} (${fmt(l.count)})`
                    )
                    .join("<br>");

                tooltip
                    .html(`<strong>${row.year}</strong><br>${lines}`)
                    .style("visibility", "visible");

                // Show the tooltip on the side with more room
                const centre = colBox.left + colBox.width / 2 - boxBox.left;
                const onRightHalf = centre > boxBox.width / 2;

                tooltip
                    .style("left", `${onRightHalf ? centre - 12 : centre + 12}px`)
                    .style("top", `${colBox.top - boxBox.top + 8}px`)
                    .style("transform", onRightHalf ? "translate(-100%, 0)" : "translate(0, 0)");

                guide
                    .attr("x1", xScale(row.year))
                    .attr("x2", xScale(row.year))
                    .style("visibility", "visible");
            }

            function hideTooltip() {
                tooltip.style("visibility", "hidden");
                guide.style("visibility", "hidden");
            }

            // Keyboard: Left/Right move between years, Esc closes the tooltip.
            // Only one column is a tab stop.
            function moveFocus(event) {
                const nodes = chart.selectAll(".year-column").nodes();
                const i = nodes.indexOf(event.currentTarget);
                let target = null;

                if (event.key === "ArrowRight") target = nodes[i + 1];
                else if (event.key === "ArrowLeft") target = nodes[i - 1];
                else if (event.key === "Escape") {
                    hideTooltip();
                    event.currentTarget.blur();
                    return;
                } else return;

                if (target) {
                    event.preventDefault();
                    target.focus();
                }
            }

            // Invisible column for each year s o the mouse and keyboard can pick a year
            chart.selectAll(".year-column")
                .data(rows)
                .join("rect")
                .attr("class", "year-column")
                .attr("role", "button")
                .attr("x", (d, i) => i === 0
                    ? 0
                    : (xScale(years[i - 1]) + xScale(years[i])) / 2)
                .attr("width", (d, i) => {
                    const left = i === 0
                        ? 0
                        : (xScale(years[i - 1]) + xScale(years[i])) / 2;
                    const right = i === years.length - 1
                        ? chartWidth
                        : (xScale(years[i]) + xScale(years[i + 1])) / 2;
                    return right - left;
                })
                .attr("y", 0)
                .attr("height", chartHeight)
                .attr("fill", "transparent")
                .attr("tabindex", 0)
                .attr("aria-describedby", "composition-keyboard-help")
                .attr("aria-label", d =>
                    `${d.year}. ` +
                    yearLines(d)
                        .map(l =>
                            `${l.name}: ${pct(l.share)}, ` +
                            `${fmt(l.count)} hospitalisations`
                        )
                        .join(". ")
                )

                .on("mouseenter focus", showTooltip)
                .on("mouseleave blur", hideTooltip)
                .on("click", showTooltip)
                .on("keydown", (event, d) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        showTooltip(event, d);
                    } else {
                        moveFocus(event);
                    }
                });


            // Legend (top to bottom, same order as the stack)
            d3.select("#road-user-composition-legend")
                .html("")
                .selectAll("span")
                .data([...keys].reverse())
                .join("span")
                .style("--c", d => colorOf[d])
                .text(d => d);
        })
        .catch(error => {
            console.error("Error loading Road User Composition data:", error);

            container
                .append("p")
                .attr("role", "alert")
                .text("Unable to load the road user composition data.");
        });
})();