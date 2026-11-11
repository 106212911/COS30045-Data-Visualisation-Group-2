/*
 * COS30045 Data Visualisation - Group 2
 * National Year-on-Year Change (2012-2021)
 *
 * Contributor: Lai Man Yee (105996175)
 * Data Source: BITRE (2023), processed using KNIME
 *
 * Purpose:
 * Displays annual percentage changes in national
 * road crash hospitalisations using a D3.js
 * diverging column chart.
 *
 * Generative AI Assistance:
 * ChatGPT assisted with developing and refining
 * the D3.js visualisation.
 * Prompts focused on calculating annual percentage
 * changes, displaying positive and negative values,
 * implementing a zero baseline, adding tooltips,
 * accessible labels and responsive chart sizing.
 *
 * The code and displayed values were reviewed
 * and tested by the contributor.
 */

(() => {
    const container = d3.select("#national-change-chart");
    if (container.empty()) return;

    const width = 900;
    const height = 330;
    const margin = { top: 34, right: 30, bottom: 58, left: 76 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const numberFormat = d3.format(",");

    // Blue and vermillion, with explicit +/- labels so colour is not the only cue.
    const positiveColour = "#0072B2";
    const negativeColour = "#D55E00";

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "group")
        .attr("aria-labelledby", "national-change-title national-change-description");

    svg.append("title")
        .attr("id", "national-change-title")
        .text("Annual percentage change in national road crash hospitalisations");

    const description = svg.append("desc")
        .attr("id", "national-change-description")
        .text("Changes from the previous year, 2012 to 2021. Bars above zero show increases; bars below zero show decreases.");

    const plot = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = container.append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip")
        .attr("id", "national-change-tooltip")
        .style("visibility", "hidden");

    function formatPercent(value) {
        return `${d3.format(Math.abs(value) < 0.1 ? "+.2f" : "+.1f")(value)}%`;
    }

    function showError(message) {
        container.append("p")
            .attr("role", "alert")
            .style("color", "#9A3412")
            .text(message);
    }

    d3.csv("data/Group2_Road_Injury_Cleaned.csv", d => ({
        Year: +d.Year,
        Breakdown: d.Breakdown.trim(),
        Category: d.Category.trim(),
        Hospitalisations: +d.Hospitalisations
    }))
        .then(data => {
            const national = data
                .filter(d => d.Breakdown === "National Total" && d.Category === "Australia")
                .sort((a, b) => a.Year - b.Year);

            const expectedYears = d3.range(2011, 2022);
            if (national.length !== expectedYears.length ||
                national.some((d, i) => d.Year !== expectedYears[i] ||
                    !Number.isFinite(d.Hospitalisations) || d.Hospitalisations <= 0)) {
                throw new Error("The National Total breakdown must contain one valid record for each year, 2011–2021.");
            }

            const changes = national.slice(1).map((current, index) => {
                const previous = national[index];
                const difference = current.Hospitalisations - previous.Hospitalisations;
                return {
                    Year: current.Year,
                    Hospitalisations: current.Hospitalisations,
                    Previous: previous.Hospitalisations,
                    Difference: difference,
                    Percent: difference / previous.Hospitalisations * 100
                };
            });

            // A balanced diverging scale means increases and decreases are comparable.
            const maximum = Math.max(6, d3.max(changes, d => Math.abs(d.Percent)) * 1.15);
            const x = d3.scaleBand()
                .domain(changes.map(d => String(d.Year)))
                .range([0, innerWidth])
                .padding(0.24);
            const y = d3.scaleLinear()
                .domain([-maximum, maximum])
                .range([innerHeight, 0]);
            const zeroY = y(0);

            // Percentage gridlines, including a bold zero line.
            plot.append("g")
                .attr("class", "change-y-axis")
                .call(d3.axisLeft(y)
                    .ticks(6)
                    .tickFormat(d => `${d}%`)
                    .tickSize(-innerWidth))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line")
                    .attr("stroke", d => d === 0 ? "#16324f" : "#DCE3EB")
                    .attr("stroke-width", d => d === 0 ? 2 : 1))
                .call(g => g.selectAll(".tick text")
                    .style("font-size", "14px")
                    .style("fill", "#334155"));

            plot.append("g")
                .attr("transform", `translate(0, ${innerHeight})`)
                .call(d3.axisBottom(x).tickSizeOuter(0))
                .call(g => g.selectAll("text")
                    .style("font-size", "14px")
                    .style("fill", "#334155"));

            plot.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", innerHeight + 46)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Year");

            plot.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -innerHeight / 2)
                .attr("y", -56)
                .attr("text-anchor", "middle")
                .attr("font-size", "15px")
                .text("Change from previous year (%)");

            const bars = plot.selectAll(".change-bar")
                .data(changes)
                .join("rect")
                .attr("class", "change-bar")
                .attr("x", d => x(String(d.Year)))
                .attr("width", x.bandwidth())
                .attr("y", d => Math.min(y(d.Percent), zeroY))
                .attr("height", d => Math.max(1.5, Math.abs(y(d.Percent) - zeroY)))
                .attr("fill", d => d.Percent >= 0 ? positiveColour : negativeColour);

            // Signed values make the direction understandable without relying on colour.
            plot.selectAll(".change-value-label")
                .data(changes)
                .join("text")
                .attr("class", "change-value-label")
                .attr("x", d => x(String(d.Year)) + x.bandwidth() / 2)
                .attr("y", d => d.Percent >= 0 ? y(d.Percent) - 8 : y(d.Percent) + 17)
                .attr("text-anchor", "middle")
                .attr("font-size", "13px")
                .attr("font-weight", "600")
                .attr("fill", "#16324f")
                .text(d => formatPercent(d.Percent));

            function showTooltip(event, d) {
                bars.attr("opacity", b => b.Year === d.Year ? 1 : 0.75);
                const barNode = bars.filter(b => b.Year === d.Year).node();
                const barRect = barNode.getBoundingClientRect();
                const containerRect = container.node().getBoundingClientRect();

                tooltip.html(
                    `<strong>${d.Year}: ${formatPercent(d.Percent)}</strong>` +
                    `<div>Hospitalisations: ${numberFormat(d.Hospitalisations)}</div>` +
                    `<div>Previous year: ${numberFormat(d.Previous)}</div>` +
                    `<div>Change: ${d.Difference > 0 ? "+" : ""}${numberFormat(d.Difference)}</div>`
                ).style("visibility", "visible");

                const tipWidth = tooltip.node().offsetWidth;
                const tipHeight = tooltip.node().offsetHeight;
                const centerX = barRect.left + barRect.width / 2 - containerRect.left;
                const posX = Math.max(tipWidth / 2 + 4,
                    Math.min(containerRect.width - tipWidth / 2 - 4, centerX));
                let posY = barRect.top - containerRect.top - 8;
                let transform = "translate(-50%, -100%)";

                if (posY - tipHeight < 0) {
                    posY = barRect.bottom - containerRect.top + 8;
                    transform = "translate(-50%, 0)";
                }

                tooltip.style("left", `${posX}px`)
                    .style("top", `${posY}px`)
                    .style("transform", transform);
            }

            function hideTooltip() {
                tooltip.style("visibility", "hidden");
                bars.attr("opacity", 1);
            }

            // Wider transparent targets make even a tiny change (2012) easy to inspect.
            plot.selectAll(".change-hit-area")
                .data(changes)
                .join("rect")
                .attr("class", "change-hit-area")
                .attr("x", d => x(String(d.Year)))
                .attr("y", 0)
                .attr("width", x.bandwidth())
                .attr("height", innerHeight)
                .attr("fill", "transparent")
                .attr("tabindex", 0)
                .attr("role", "button")
                .attr("aria-describedby", "national-change-description")
                .attr("aria-label", d =>
                    `${d.Year}: ${formatPercent(d.Percent)} compared with ${d.Year - 1}. ` +
                    `${numberFormat(d.Hospitalisations)} hospitalisations, ` +
                    `${d.Difference >= 0 ? "increase" : "decrease"} of ${numberFormat(Math.abs(d.Difference))}.`)
                .on("mouseenter focus click", showTooltip)
                .on("mouseleave blur", hideTooltip)
                .on("keydown", function (event, d) {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        showTooltip(event, d);
                    } else if (event.key === "Escape") {
                        hideTooltip();
                        this.blur();
                    }
                });

            description.text(
                "National annual hospitalisation counts compared with the previous year. " +
                changes.map(d => `${d.Year}: ${formatPercent(d.Percent)}`).join("; ") +
                ". Positive bars are blue and negative bars are vermillion; signed labels also show direction."
            );
        })
        .catch(error => {
            console.error("National year-on-year chart:", error);
            showError("Unable to display annual changes. Please check the CSV file.");
        });
})();
