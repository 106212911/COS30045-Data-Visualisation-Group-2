// basic configs
const DATA_FILE = "first_nations_annual_hospitalisations.csv"; 
const COLORS = {
  "First Nations peoples": "#c8481d",
  "Non-Indigenous Australians": "#1f6f78"
};
const VIEWS = {
  fn:    "First Nations only (counts)",
  both:  "Both groups (counts)",
  index: "Growth since 2011 (2011 = 100)"
};

const margin = { top: 40, right: 30, bottom: 50, left: 70 };
const width = 800 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

const svg = d3.select("#first-nations-chart")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

// loading the data's
d3.csv(DATA_FILE, d => ({
  group: d.PopulationGroup,
  year: +d.Year,
  value: +d.Hospitalisations
})).then(raw => {

  // add index value (2011 = 100) for each group
  const grouped = d3.group(raw, d => d.group);
  grouped.forEach(rows => {
    rows.sort((a, b) => a.year - b.year);
    const base = rows[0].value;
    rows.forEach(r => r.index = (r.value / base) * 100);
  });

  // dropdown
  d3.select("#controls")
    .append("label").text("View: ")
    .append("select").attr("id", "view-select")
    .selectAll("option")
    .data(Object.entries(VIEWS))
    .join("option")
    .attr("value", d => d[0])
    .text(d => d[1]);

  d3.select("#view-select").on("change", function () { draw(this.value); });

  draw("fn");

  //the draw func
  function draw(view) {
    svg.selectAll("*").remove();

    const useIndex = view === "index";
    const field = useIndex ? "index" : "value";
    const names = view === "fn" ? ["First Nations peoples"] : Array.from(grouped.keys());
    const series = names.map(n => ({ name: n, values: grouped.get(n) }));
    const all = series.flatMap(s => s.values);

    const x = d3.scaleLinear()
      .domain(d3.extent(all, d => d.year))
      .range([0, width]);

    const yMin = useIndex ? 80 : 0;
    const y = d3.scaleLinear()
      .domain([yMin, d3.max(all, d => d[field]) * 1.1])
      .range([height, 0]);

    // chart's axes and grids
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(11));
    svg.append("g")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(d3.format(",.0f")))
      .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"))
      .call(g => g.select(".domain").remove());

    svg.append("text")
      .attr("x", width / 2).attr("y", height + 42)
      .attr("text-anchor", "middle").text("Year");
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -55)
      .attr("text-anchor", "middle")
      .text(useIndex ? "Index (2011 = 100)" : "Hospitalisations");

    // reference line at 100 for index view
    if (useIndex) {
      svg.append("line")
        .attr("x1", 0).attr("x2", width)
        .attr("y1", y(100)).attr("y2", y(100))
        .attr("stroke", "#888").attr("stroke-dasharray", "4 4");
    }

    // for the lines
    const line = d3.line().x(d => x(d.year)).y(d => y(d[field]));
    series.forEach(s => {
      svg.append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", COLORS[s.name])
        .attr("stroke-width", 2.5)
        .attr("d", line);

      svg.selectAll(`.dot-${s.name.replace(/\W/g, "")}`)
        .data(s.values)
        .join("circle")
        .attr("class", `dot-${s.name.replace(/\W/g, "")}`)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d[field]))
        .attr("r", 5)
        .attr("fill", COLORS[s.name])
        .on("mouseover", (event, d) => {
          const extra = useIndex
            ? `Index: ${d.index.toFixed(1)}<br>Actual: ${d3.format(",")(d.value)}`
            : `${d3.format(",")(d.value)} hospitalisations`;
          tooltip.style("opacity", 1)
            .html(`<strong>${d.group}</strong><br>${d.year}<br>${extra}`);
        })
        .on("mousemove", event => {
          tooltip.style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    });

    // the legend in the chart aka readability
    series.forEach((s, i) => {
      const g = svg.append("g").attr("transform", `translate(10,${-20 + i * 0})`);
      g.append("rect").attr("x", i * 230).attr("width", 14).attr("height", 14).attr("fill", COLORS[s.name]);
      g.append("text").attr("x", i * 230 + 20).attr("y", 12).text(s.name).style("font-size", "13px");
    });
  }
}).catch(err => console.error("CSV load failed:", err));