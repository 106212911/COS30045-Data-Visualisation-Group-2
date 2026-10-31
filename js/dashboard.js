const FILES = {
  national: "national_annual_hospitalisations.csv",
  fn: "first_nations_annual_hospitalisations.csv"
};

const FN = "First Nations peoples";
const NON = "Non-Indigenous Australians";
const COLORS = { 
  [FN]: "#ff5a4f", 
  [NON]: "#14b8c4", 
  National: "#7c3aed" 
};

const VIEWS = {
  fn: "First Nations only (counts)",
  both: "Both groups (counts)",
  index: "Growth since 2011 (2011 = 100)"
};

const fmt = d3.format(",");
const tip = d3.select("#tooltip");

// Centralised application state
const state = { year: 2021, view: "fn" };
let national = [], fnRows = [];

// Load all datasets concurrently
Promise.all([
  d3.csv(FILES.national, d => ({ year: +d.Year, value: +d.Hospitalisations })),
  d3.csv(FILES.fn, d => ({ group: d.PopulationGroup, year: +d.Year, value: +d.Hospitalisations }))
]).then(([n, f]) => {
  national = n.sort((a, b) => a.year - b.year);
  fnRows = f.sort((a, b) => a.year - b.year);
  init();
}).catch(err => {
  console.error("Data loading error:", err);
  document.querySelector("main").insertAdjacentHTML("afterbegin",
    '<p class="error" style="background:#fee2e2; color:#b91c1c; padding:1rem; border-radius:8px; margin-bottom:1rem;">Could not load dataset CSV files. Check file paths and run via a local server (e.g., Live Server in VS Code).</p>');
});

// Initialise UI controls and event listeners
function init() {
  const years = national.map(d => d.year);
  
  // Populate dropdown options
  d3.select("#year-select").selectAll("option")
    .data(years).join("option")
    .attr("value", d => d).text(d => d);

  d3.select("#view-select").selectAll("option")
    .data(Object.entries(VIEWS)).join("option")
    .attr("value", d => d[0]).text(d => d[1]);

  // Bind UI events
  d3.select("#year-select").on("change", function () { 
    state.year = +this.value; 
    render(); 
  });
  
  d3.select("#view-select").on("change", function () { 
    state.view = this.value; 
    render(); 
  });
  
  d3.select("#reset-btn").on("click", () => {
    state.year = d3.max(years);
    state.view = "fn";
    render();
  });

  // Set default view to max year
  state.year = d3.max(years);
  render();
}

// Master render loop
function render() {
  d3.select("#year-select").property("value", state.year);
  d3.select("#view-select").property("value", state.view);
  
  drawKpis();
  drawNational();
  drawFirstNations();
}

// Update top summary cards dynamically based on selected year
function drawKpis() {
  const at = (rows, y) => rows.find(r => r.year === y);
  const fnOnly = fnRows.filter(r => r.group === FN);
  
  const nat = at(national, state.year);
  const fnNow = at(fnOnly, state.year);
  
  if (!nat || !fnNow) return;
  
  const growth = (fnNow.value / fnOnly[0].value - 1) * 100;

  d3.select("#kpi-national").text(fmt(nat.value));
  d3.select("#kpi-national-sub").text(`people in ${state.year}`);
  
  d3.select("#kpi-fn").text(fmt(fnNow.value));
  d3.select("#kpi-fn-sub").text(`people in ${state.year}`);
  
  d3.select("#kpi-growth").text(`${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`);
}

// Render National Trends Chart
function drawNational() {
  const values = national.map(d => ({ year: d.year, y: d.value, raw: d.value, name: "National" }));
  drawLines("#national-chart", [{ name: "National", values }], { yLabel: "Hospitalisations" });
}

// Render First Nations Chart & Legend
function drawFirstNations() {
  const groups = d3.group(fnRows, d => d.group);
  const series = [];
  const names = state.view === "fn" ? [FN] : [FN, NON];

  names.forEach(name => {
    const rows = groups.get(name);
    if (!rows) return;
    const base = rows[0].value;
    
    series.push({
      name,
      values: rows.map(r => ({
        year: r.year, 
        name, 
        raw: r.value,
        y: state.view === "index" ? (r.value / base) * 100 : r.value,
        index: (r.value / base) * 100
      }))
    });
  });

  const idx = state.view === "index";
  drawLines("#fn-chart", series, {
    yLabel: idx ? "Index (2011 = 100)" : "Hospitalisations",
    yMin: idx ? 80 : 0,
    baseline: idx ? 100 : null,
    showIndex: idx
  });

  // Rebuild legend items
  d3.select("#fn-legend").html("")
    .selectAll("span").data(series).join("span")
    .style("--c", d => COLORS[d.name])
    .text(d => d.name);
}

// Reusable D3 Line Chart Drawing Engine
function drawLines(sel, series, opts) {
  const W = 560, H = 300, m = { top: 16, right: 20, bottom: 38, left: 58 };
  const w = W - m.left - m.right, h = H - m.top - m.bottom;

  const root = d3.select(sel).html("");
  const svg = root.append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("role", "img")
    .attr("aria-label", `Line chart of ${opts.yLabel}`);
    
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const all = series.flatMap(s => s.values);
  const x = d3.scaleLinear().domain(d3.extent(all, d => d.year)).range([0, w]);
  const y = d3.scaleLinear()
    .domain([opts.yMin ?? 0, d3.max(all, d => d.y) * 1.1])
    .nice()
    .range([h, 0]);

  // Gridlines & Axes
  g.append("g").attr("class", "grid-line")
    .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(""));
    
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(11));
    
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",.0f")));

  g.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)")
    .attr("x", -h / 2).attr("y", -46).attr("text-anchor", "middle").text(opts.yLabel);

  // Optional 100-baseline for index view
  if (opts.baseline) {
    g.append("line").attr("x1", 0).attr("x2", w)
      .attr("y1", y(opts.baseline)).attr("y2", y(opts.baseline))
      .attr("stroke", "#8a96a5").attr("stroke-dasharray", "4 4");
  }

  // Vertical year selection indicator line
  if (x(state.year) >= 0 && x(state.year) <= w) {
    g.append("line").attr("x1", x(state.year)).attr("x2", x(state.year))
      .attr("y1", 0).attr("y2", h).attr("stroke", "#7c3aed")
      .attr("stroke-width", 2).attr("stroke-dasharray", "2 4");
  }

  // Draw lines and interactive points
  const line = d3.line().x(d => x(d.year)).y(d => y(d.y));
  
  series.forEach(s => {
    g.append("path")
      .datum(s.values)
      .attr("fill", "none")
      .attr("stroke", COLORS[s.name] || "#1b1f3b")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    g.selectAll(null).data(s.values).join("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.y))
      .attr("r", d => (d.year === state.year ? 7 : 4))
      .attr("fill", COLORS[s.name] || "#1b1f3b")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", (e, d) => {
        const extra = opts.showIndex ? `<br>Index: ${d.index.toFixed(1)}` : "";
        tip.style("opacity", 1).html(
          `<strong>${d.name}</strong><br>Year: ${d.year}<br>${fmt(d.raw)} hospitalisations${extra}`
        );
      })
      .on("mousemove", e => {
        tip.style("left", (e.pageX + 12) + "px").style("top", (e.pageY - 28) + "px");
      })
      .on("mouseout", () => tip.style("opacity", 0));
  });
}