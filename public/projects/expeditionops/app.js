import {
  uid,
  blank,
  validateData,
  bagWeight,
  alerts,
  stats,
} from "./domain.js";
import { localApi, parseBackup, encodeBackup } from "./storage.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const paths = {
  overview: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  equipment: '<path d="M4 7h16v14H4zM8 7V3h8v4M4 12h16M10 10v4h4v-4"/>',
  bags: '<rect x="5" y="6" width="14" height="15" rx="2"/><path d="M9 6V3h6v3M8 10v7M16 10v7"/>',
  team: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
  readiness: '<path d="M9 4h6v3H9zM9 5H5v16h14V5h-4M8 14l3 3 5-6"/>',
  settings: '<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  print: '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  plans: '<path d="m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n] || paths.overview}</svg>`;
let data = null,
  current = null,
  revision = 0,
  expeditions = [],
  view = "overview",
  busy = false,
  dirty = false,
  status = "Saved in this browser",
  toastTimer,
  search = "",
  filter = "all";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const kg = (n) => `${Number(n).toFixed(1)} kg`,
  usd = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n),
  when = (s) =>
    s
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(s + "T12:00:00Z"))
      : "Not set";
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 4200);
}
async function api(path, method = "GET", body) {
  return localApi(path, method, body);
}
async function list() {
  expeditions = (await api("/api/expeditions")).expeditions;
}
async function load(id) {
  const out = await api("/api/expeditions/" + id);
  current = out.id;
  data = out.data;
  revision = out.revision;
  dirty = false;
  status = "Saved in this browser";
  view = "overview";
  render();
}
async function create(demo) {
  if (busy) return;
  busy = true;
  try {
    const out = await api("/api/expeditions", "POST", { demo });
    await list();
    await load(out.id);
    toast(
      demo
        ? "Demo expedition created. All names and equipment are examples."
        : "Your expedition is ready to plan.",
    );
    if (!demo) {
      busy = false;
      edit("settings");
    }
  } catch (e) {
    toast(e.message);
  } finally {
    busy = false;
  }
}
async function save() {
  if (busy) return false;
  busy = true;
  dirty = true;
  status = "Saving…";
  setStatus();
  try {
    validateData(data);
    const r = await api("/api/expeditions/" + current, "PUT", {
      data,
      revision,
    });
    revision = r.revision;
    dirty = false;
    status = "Saved in this browser";
    const row = expeditions.find((e) => e.id === current);
    if (row) row.name = data.name;
    return true;
  } catch (e) {
    status =
      e.status === 409
        ? "Another tab has newer changes · export, then reload"
        : "Not saved · retry";
    toast(e.message);
    return false;
  } finally {
    busy = false;
    setStatus();
  }
}
function setStatus() {
  if ($("#save-state")) $("#save-state").textContent = status;
  document
    .querySelectorAll("[data-mutates]")
    .forEach((b) => (b.disabled = busy));
  if ($("#retry-save")) $("#retry-save").hidden = !dirty;
}
function go(v) {
  view = v;
  search = "";
  filter = "all";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function intro(title, subtitle, action = "") {
  return `<div class="intro"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${action}</div></div>`;
}
function render() {
  const labels = {
    overview: "Overview",
    equipment: "Equipment",
    bags: "Bags & freight",
    team: "Travelers",
    readiness: "Readiness",
    settings: "Expedition settings",
  };
  $("#app").innerHTML =
    `<div class="shell"><aside class="side"><a class="brand" href="/" aria-label="Return to Max Freedman projects"><img src="./favicon.svg" alt="">ExpeditionOps</a><div class="side-label">Field workspace</div><nav class="nav" aria-label="Expedition navigation">${["overview", "equipment", "bags", "team", "readiness", "settings"].map((v) => `<button data-view="${v}" ${!data ? "disabled" : ""} class="${view === v ? "active" : ""}" ${view === v ? 'aria-current="page"' : ""}>${icon(v)}${labels[v]}</button>`).join("")}</nav><div class="side-bottom"><button class="btn dark" data-action="fieldpack" ${!data ? "disabled" : ""}>${icon("print")}Export field pack</button><button class="btn dark" data-view="settings" ${!data ? "disabled" : ""}>${icon("download")}Backup &amp; restore</button><a class="site-return" href="/">← Max Freedman / Projects</a><div class="side-note">Arrive ready. Keep your team and equipment on the same plan.</div></div></aside><main class="main"><div class="topbar"><div>${data ? `<select class="workspace-select" id="workspace" aria-label="Select expedition">${expeditions.map((e) => `<option value="${esc(e.id)}" ${current === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>` : "Your expedition workspace"}</div><div class="actions"><span class="save-state" id="save-state">${data ? esc(status) : "Browser demo"}</span><button class="subtle" id="retry-save" ${dirty ? "" : "hidden"} data-action="retry">Retry save</button><button class="subtle" data-action="import">Import JSON</button><button class="subtle" data-action="new">+ New expedition</button></div></div><div class="local-notice">Browser demo · Plans are saved on this device. Export JSON to back up or transfer a plan.</div>${data && data.demo ? `<div class="demo-banner"><span><strong>Demo expedition</strong> · Fictional team and equipment. Edit freely, or start a blank expedition.</span><button class="subtle" data-action="new">Start blank</button></div>` : ""}${!data ? welcome() : view === "overview" ? overview() : view === "equipment" ? equipment() : view === "bags" ? bags() : view === "team" ? team() : view === "readiness" ? readiness() : settings()}<input type="file" id="import-file" accept="application/json,.json" hidden></main></div><section class="fieldpack" id="fieldpack"></section>`;
  bind();
  setStatus();
}
function welcome() {
  return `<section class="welcome"><span class="tag demo">Built for teams heading into the field</span><h1>The right equipment.<br>The right person.<br>There when you need it.</h1><p>Connect equipment, bags, travelers, and readiness in one expedition plan. Catch missing kit, excess baggage, and late arrivals before departure.</p><div class="actions"><button class="btn orange" data-action="demo">Explore demo expedition</button><button class="btn primary" data-action="new">Start your expedition</button><button class="btn" data-action="import">Import JSON backup</button></div><div class="welcome-cards"><article>${icon("equipment")}<h3>One equipment manifest</h3><p>Know what’s packed, where it is, and who owns it.</p></article><article>${icon("bags")}<h3>Connect the travel plan</h3><p>Allocate bags and check their arrival against the setup schedule.</p></article><article>${icon("readiness")}<h3>A departure-ready team</h3><p>Assign open tasks and export the information you’ll need in the field.</p></article></div></section>`;
}
function overview() {
  const s = stats(data),
    a = alerts(data, today()),
    critical = a.filter((x) => x.kind === "critical").length;
  return (
    intro(
      "Arrive ready.",
      `${esc(data.location || "Location not set")} · ${when(data.start)} – ${when(data.end)}`,
      `<button class="btn" data-action="backup">${icon("download")}Export JSON</button><button class="btn primary" data-action="fieldpack">${icon("print")}Export field pack</button>`,
    ) +
    `<div class="metrics"><div class="metric"><div class="metric-label">Departure readiness ${icon("readiness")}</div><strong>${s.readiness}%</strong><div class="progress"><div style="width:${s.readiness}%"></div></div><small>${s.packed}/${data.items.length} item records packed · ${s.done}/${data.tasks.length} tasks complete</small></div><div class="metric"><div class="metric-label">Equipment & cases ${icon("bags")}</div><strong>${kg(s.weight)}</strong><small>${data.bags.length} bags / freight units · includes case weight</small></div><div class="metric"><div class="metric-label">Traveling team ${icon("team")}</div><strong>${data.travelers.length}</strong><small>${data.travelers.filter((p) => p.arrival).length} arrival dates entered</small></div><div class="metric"><div class="metric-label">Needs attention ${icon("alert")}</div><strong>${a.length}</strong><small>${critical} critical · ${a.length - critical} warnings</small></div></div><div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><h2>Resolve before departure</h2><p>Checks based on your dates, assignments, and limits.</p></div><span class="tag ${critical ? "red" : ""}">${a.length} alerts</span></div><div class="alerts">${
      a.length
        ? a
            .slice(0, 8)
            .map(
              (x) =>
                `<div class="alert ${x.kind}">${icon("alert")}<button data-alert-view="${x.view}" data-alert-id="${esc(x.id)}"><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p></button></div>`,
            )
            .join("")
        : `<div class="empty">${icon("check")}<h2>No current planning alerts.</h2><p>Keep equipment assignments and arrival dates current.</p></div>`
    }</div>${a.length > 8 ? `<div class="panel-body small muted">${a.length - 8} more alerts appear in your exported field pack.</div>` : ""}</section><section class="panel"><div class="panel-header"><div><h2>Load plan</h2><p>Total case weights against your entered limits.</p></div><button class="subtle" data-view="bags">Manage bags</button></div>${
      data.bags.length
        ? data.bags
            .map((b) => {
              const w = bagWeight(data, b),
                p = data.travelers.find((p) => p.id === b.traveler),
                pct = b.limit ? Math.min(100, (w / b.limit) * 100) : 0;
              return `<div class="bag-row"><div class="bag-heading"><strong>${esc(b.name)}</strong><span class="${b.limit && w > b.limit ? "tag red" : ""}">${kg(w)} / ${b.limit || "—"}</span></div><p>${b.mode === "shipment" ? "Freight · " + when(b.arrival) : esc(p?.name || "Carrier unassigned")}</p><div class="progress"><div style="width:${pct}%;${b.limit && w > b.limit ? "background:#d26c50" : ""}"></div></div></div>`;
            })
            .join("")
        : '<div class="empty">Add bags to build your load plan.</div>'
    }<div class="trip-strip"><div><span>Setup begins</span><strong>${when(data.setup)}</strong></div><div><span>Unassigned items</span><strong>${data.items.filter((i) => !i.bag).length}</strong></div><div><span>Equipment value</span><strong>${usd(s.value)}</strong></div></div></section></div>`
  );
}
function equipment() {
  return (
    intro(
      "Every item has a place.",
      "Track ownership, packing, testing, and when equipment is needed.",
      `<button class="btn" data-action="csv">${icon("download")}Export CSV</button><button class="btn primary" data-edit="items" data-mutates>${icon("plus")}Add equipment</button>`,
    ) +
    `<div class="toolbar"><input id="search" aria-label="Search equipment" placeholder="Search equipment, owner, or serial…" value="${esc(search)}"><select id="filter" aria-label="Filter equipment"><option value="all">All equipment</option><option value="critical" ${filter === "critical" ? "selected" : ""}>Critical equipment</option><option value="unassigned" ${filter === "unassigned" ? "selected" : ""}>No bag assigned</option><option value="unpacked" ${filter === "unpacked" ? "selected" : ""}>Not packed</option></select></div><section class="panel table-wrap"><table><thead><tr><th>Equipment</th><th>Bag / freight unit</th><th>Weight</th><th>Needed by</th><th>Tested</th><th>Packed</th><th></th></tr></thead><tbody id="equipment-rows">${equipmentRows()}</tbody></table></section><p class="small muted mt">Item weights and values are per unit. Quantity is included in totals.</p>`
  );
}
function equipmentRows() {
  const list = data.items.filter(
    (i) =>
      (i.name + " " + i.owner + " " + i.serial)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "critical" && i.critical) ||
        (filter === "unassigned" && !i.bag) ||
        (filter === "unpacked" && !i.packed)),
  );
  return list.length
    ? list
        .map((i) => {
          const b = data.bags.find((b) => b.id === i.bag);
          return `<tr><td><strong>${esc(i.name)}</strong>${i.critical ? ' <span class="tag">Critical</span>' : ""}<small>${i.qty} × ${esc(i.category || "Equipment")} · ${esc(i.owner || "Owner not set")}</small></td><td>${b ? esc(b.name) : '<span class="tag red">Unassigned</span>'}</td><td class="nowrap">${kg(i.weight * i.qty)}</td><td class="nowrap">${when(i.needed || data.setup)}</td><td><input class="check" type="checkbox" aria-label="Mark ${esc(i.name)} tested" data-toggle="items" data-id="${esc(i.id)}" data-key="tested" ${i.tested ? "checked" : ""} data-mutates></td><td><input class="check" type="checkbox" aria-label="Mark ${esc(i.name)} packed" data-toggle="items" data-id="${esc(i.id)}" data-key="packed" ${i.packed ? "checked" : ""} data-mutates></td><td><button class="subtle" data-edit="items" data-id="${esc(i.id)}" data-mutates>Edit</button></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="7"><div class="empty">No equipment matches. Add an item or change your filters.</div></td></tr>';
}
function bags() {
  return (
    intro(
      "A load plan that travels with you.",
      "Assign cases to travelers or freight, then balance the weight.",
      `<button class="btn primary" data-edit="bags" data-mutates>${icon("plus")}Add bag or shipment</button>`,
    ) +
    `<div class="bag-grid">${data.bags
      .map((b) => {
        const p = data.travelers.find((p) => p.id === b.traveler),
          items = data.items.filter((i) => i.bag === b.id),
          w = bagWeight(data, b);
        return `<article class="bag-card"><div class="card-top"><div><h3>${esc(b.name)}</h3><p>${b.mode === "shipment" ? "Freight shipment" : esc(p?.name || "Carrier unassigned")}</p></div><button class="subtle" data-edit="bags" data-id="${esc(b.id)}" data-mutates>Edit</button></div><div class="bag-weight">${w.toFixed(1)} <span>/ ${b.limit || "—"} kg</span></div><div class="progress mt"><div style="width:${b.limit ? Math.min(100, (w / b.limit) * 100) : 0}%;${w > b.limit && b.limit ? "background:#d26c50" : ""}"></div></div><div class="card-details"><div><span>Case / container weight</span><strong>${kg(b.tare)}</strong></div><div><span>Arrival</span><strong>${when(b.mode === "shipment" ? b.arrival : p?.arrival)}</strong></div><div><span>Equipment value</span><strong>${usd(items.reduce((s, i) => s + i.value * i.qty, 0))}</strong></div></div><div class="card-list">${items.length ? items.map((i) => `<div><span>${esc(i.name)}${i.qty > 1 ? " × " + i.qty : ""}</span><strong>${kg(i.weight * i.qty)}</strong></div>`).join("") : '<span class="muted">Assign equipment to this bag in the manifest.</span>'}</div></article>`;
      })
      .join(
        "",
      )}</div>${!data.bags.length ? '<div class="empty">Add your first bag or freight unit.</div>' : ""}<div class="notice">Baggage limits are entered by your team. Include personal luggage and check each carrier’s current rules when setting the allowance.</div>`
  );
}
function team() {
  return (
    intro(
      "People and equipment, on one timeline.",
      "Keep arrival dates and baggage allowances connected to the load plan.",
      `<button class="btn primary" data-edit="travelers" data-mutates>${icon("plus")}Add traveler</button>`,
    ) +
    `<div class="team-grid">${data.travelers
      .map((p) => {
        const bs = data.bags.filter(
            (b) => b.mode === "traveler" && b.traveler === p.id,
          ),
          w = bs.reduce((s, b) => s + bagWeight(data, b), 0);
        return `<article class="team-card"><div class="card-top"><div class="avatar">${esc(
          p.name
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2),
        )}</div><button class="subtle" data-edit="travelers" data-id="${esc(p.id)}" data-mutates>Edit</button></div><h2>${esc(p.name)}</h2><p class="small muted">${esc(p.role || "Team member")}</p><div class="card-details"><div><span>Arrival</span><strong>${when(p.arrival)}</strong></div><div><span>Departure</span><strong>${when(p.departure)}</strong></div><div><span>Assigned baggage</span><strong>${kg(w)} / ${p.allowance} kg</strong></div><div><span>Bag count</span><strong>${bs.length} / ${p.maxBags}</strong></div></div><div class="card-list">${bs.map((b) => `<div>${esc(b.name)}</div>`).join("") || '<span class="muted">No bags assigned</span>'}</div>${p.email ? `<p class="small muted mt">${esc(p.email)}</p>` : ""}</article>`;
      })
      .join(
        "",
      )}</div>${!data.travelers.length ? '<div class="empty">Add a traveler to start allocating baggage.</div>' : ""}`
  );
}
function readiness() {
  const s = stats(data);
  return (
    intro(
      "Close the gaps before departure.",
      `${s.done} of ${data.tasks.length} tasks complete. Every task has a place for an owner and a due date.`,
      `<button class="btn primary" data-edit="tasks" data-mutates>${icon("plus")}Add task</button>`,
    ) +
    `<section class="panel">${
      data.tasks
        .map((t) => {
          const p = data.travelers.find((p) => p.id === t.assignee);
          return `<article class="task-row ${t.done ? "complete" : ""}"><input class="check" type="checkbox" aria-label="Complete ${esc(t.title)}" data-toggle="tasks" data-id="${esc(t.id)}" data-key="done" ${t.done ? "checked" : ""} data-mutates><div class="task-main"><h3>${esc(t.title)}</h3><p>${esc(p?.name || "Owner unassigned")} · Due ${when(t.due)}</p><div class="task-meta">${t.blocking ? '<span class="tag">Departure blocker</span>' : ""}${!t.done && t.due && t.due < today() ? '<span class="tag red">Overdue</span>' : ""}${t.done ? '<span class="tag green">Complete</span>' : ""}</div></div><button class="subtle" data-edit="tasks" data-id="${esc(t.id)}" data-mutates>Edit</button></article>`;
        })
        .join("") ||
      '<div class="empty">Add the checks your team needs before departure.</div>'
    }</section>`
  );
}
function settings() {
  return (
    intro(
      "Set the expedition baseline.",
      "Arrival checks use the setup date unless an item has its own needed-by date.",
    ) +
    `<section class="panel settings"><div class="panel-body"><div class="form-grid"><div class="field"><label>Expedition</label><strong>${esc(data.name)}</strong></div><div class="field"><label>Destination / base</label><strong>${esc(data.location || "Not set")}</strong></div><div class="field"><label>Start</label><strong>${when(data.start)}</strong></div><div class="field"><label>End</label><strong>${when(data.end)}</strong></div><div class="field"><label>Setup begins</label><strong>${when(data.setup)}</strong></div><div class="field"><label>Workspace</label><strong>${data.demo ? "Demo data" : "Live planning"}</strong></div></div><div class="actions mt"><button class="btn primary" data-edit="settings" data-mutates>Edit expedition</button><button class="btn" data-action="reload">Reload latest</button></div></div></section><section class="panel settings mt"><div class="panel-header"><h2>Your expedition data</h2></div><div class="panel-body"><p class="small muted">Export a complete JSON backup, or import one to replace this expedition’s current plan.</p><div class="actions mt"><button class="btn" data-action="backup">${icon("download")}Export backup</button><button class="btn" data-action="import" data-mutates>Import backup</button></div></div></section>`
  );
}

const fields = {
  settings: [
    ["name", "Expedition name", "text"],
    ["location", "Destination / base", "text"],
    ["start", "Expedition start", "date"],
    ["end", "Expedition end", "date"],
    ["setup", "Setup begins", "date"],
    ["demo", "Label as demo data", "checkbox"],
  ],
  items: [
    ["name", "Equipment name", "text"],
    ["category", "Category", "text"],
    ["qty", "Quantity", "number"],
    ["weight", "Unit weight (kg)", "number"],
    ["value", "Unit value (USD)", "number"],
    ["owner", "Equipment owner", "text"],
    ["serial", "Serial number(s)", "text"],
    ["bag", "Bag / shipment", "bags"],
    ["needed", "Needed by", "date"],
    ["critical", "Critical to operation", "checkbox"],
    ["tested", "Tested", "checkbox"],
    ["packed", "Packed", "checkbox"],
  ],
  bags: [
    ["name", "Bag / shipment name", "text"],
    ["mode", "Transport", "mode"],
    ["traveler", "Traveler", "travelers"],
    ["arrival", "Shipment arrival (freight only)", "date"],
    ["tare", "Empty case weight (kg)", "number"],
    ["limit", "Weight limit (kg; 0 = unset)", "number"],
  ],
  travelers: [
    ["name", "Traveler name", "text"],
    ["role", "Team role", "text"],
    ["email", "Contact email", "email"],
    ["arrival", "Arrival date", "date"],
    ["departure", "Departure date", "date"],
    ["allowance", "Total baggage allowance (kg)", "number"],
    ["maxBags", "Maximum bag count", "number"],
  ],
  tasks: [
    ["title", "Task", "text"],
    ["assignee", "Responsible traveler", "travelers"],
    ["due", "Due date", "date"],
    ["blocking", "Departure blocker", "checkbox"],
    ["done", "Complete", "checkbox"],
  ],
};
const defaults = {
  items: () => ({
    id: uid(),
    name: "",
    category: "",
    qty: 1,
    weight: 0,
    value: 0,
    owner: "",
    serial: "",
    bag: "",
    needed: data.setup,
    critical: false,
    tested: false,
    packed: false,
  }),
  bags: () => ({
    id: uid(),
    name: "",
    mode: "traveler",
    traveler: "",
    arrival: "",
    tare: 0,
    limit: 23,
  }),
  travelers: () => ({
    id: uid(),
    name: "",
    role: "",
    email: "",
    arrival: data.start,
    departure: data.end,
    allowance: 23,
    maxBags: 1,
  }),
  tasks: () => ({
    id: uid(),
    title: "",
    assignee: "",
    due: data.setup,
    blocking: false,
    done: false,
  }),
};
function inputField([key, label, type], record) {
  const val = record[key] ?? "",
    required = ["name", "title"].includes(key);
  if (type === "checkbox")
    return `<div class="field checkbox"><input id="f-${key}" name="${key}" type="checkbox" ${val ? "checked" : ""}><label for="f-${key}">${label}</label></div>`;
  if (["bags", "travelers", "mode"].includes(type)) {
    let options =
      type === "mode"
        ? [
            ["traveler", "Traveler baggage"],
            ["shipment", "Freight shipment"],
          ]
        : [["", "Unassigned"], ...data[type].map((x) => [x.id, x.name])];
    return `<div class="field"><label for="f-${key}">${label}</label><select id="f-${key}" name="${key}">${options.map(([id, name]) => `<option value="${esc(id)}" ${val === id ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></div>`;
  }
  return `<div class="field"><label for="f-${key}">${label}</label><input id="f-${key}" name="${key}" type="${type}" value="${esc(val)}" ${required ? "required" : ""} ${type === "number" ? 'min="0" step="any"' : ""} maxlength="${key === "title" ? 300 : key === "serial" ? 300 : 200}"></div>`;
}
function modal(title, body) {
  const d = $("#dialog");
  d.innerHTML = `<div class="dialog-title"><h2>${title}</h2><button aria-label="Close dialog" id="close-dialog">×</button></div>${body}`;
  $("#close-dialog").onclick = () => d.close();
  d.showModal();
}
function edit(type, id) {
  if (busy) return;
  const record = structuredClone(
    type === "settings"
      ? data
      : id
        ? data[type].find((x) => x.id === id)
        : defaults[type](),
  );
  modal(
    type === "settings"
      ? "Expedition settings"
      : `${id ? "Edit" : "Add"} ${{ items: "equipment", bags: "bag / shipment", travelers: "traveler", tasks: "task" }[type]}`,
    `<form id="edit-form"><div class="form-grid">${fields[type].map((f) => inputField(f, record)).join("")}</div><div class="error" id="form-error" role="alert"></div><div class="dialog-actions">${id ? '<button type="button" class="subtle" id="delete-record">Delete</button>' : ""}<button type="button" class="btn" id="cancel-edit">Cancel</button><button type="submit" class="btn primary" id="submit-edit">Save changes</button></div></form>`,
  );
  $("#cancel-edit").onclick = () => $("#dialog").close();
  $("#edit-form").onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.target);
    const r = { ...record };
    fields[type].forEach(
      ([k, l, t]) =>
        (r[k] =
          t === "checkbox"
            ? form.has(k)
            : t === "number"
              ? Number(form.get(k))
              : String(form.get(k) || "")),
    );
    if (type === "bags" && r.mode === "shipment") r.traveler = "";
    let next = structuredClone(data);
    if (type === "settings") next = { ...data, ...r };
    else if (id) next[type] = next[type].map((x) => (x.id === id ? r : x));
    else {
      next[type] = next[type].filter((x) => x.id !== r.id);
      next[type].push(r);
    }
    try {
      validateData(next);
    } catch (err) {
      $("#form-error").textContent = err.message;
      return;
    }
    data = next;
    $("#submit-edit").disabled = true;
    const ok = await save();
    if (ok) {
      $("#dialog").close();
      render();
      toast("Changes saved in this browser.");
    } else {
      $("#submit-edit").disabled = false;
      $("#form-error").textContent = status;
    }
  };
  if (id)
    $("#delete-record").onclick = async () => {
      if (busy) return;
      if (
        !confirm(
          "Delete this record? Linked assignments will become unassigned.",
        )
      )
        return;
      data[type] = data[type].filter((x) => x.id !== id);
      if (type === "bags")
        data.items.forEach((i) => {
          if (i.bag === id) i.bag = "";
        });
      if (type === "travelers") {
        data.bags.forEach((b) => {
          if (b.traveler === id) b.traveler = "";
        });
        data.tasks.forEach((t) => {
          if (t.assignee === id) t.assignee = "";
        });
      }
      if (await save()) {
        $("#dialog").close();
        render();
        toast("Record deleted.");
      } else $("#form-error").textContent = status;
    };
}
function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function backup() {
  download("ExpeditionOps-backup.json", encodeBackup(data));
  toast("Full expedition backup exported.");
}
function csv() {
  const cell = (x) =>
    '"' +
    String(/^[=+@-]/.test(String(x)) ? "'" + x : x).replace(/"/g, '""') +
    '"';
  const rows = [
    [
      "Name",
      "Category",
      "Quantity",
      "Unit weight kg",
      "Total weight kg",
      "Unit value USD",
      "Owner",
      "Serial",
      "Bag",
      "Carrier",
      "Arrival",
      "Needed by",
      "Critical",
      "Tested",
      "Packed",
    ],
    ...data.items.map((i) => {
      const b = data.bags.find((b) => b.id === i.bag),
        p = data.travelers.find((p) => p.id === b?.traveler);
      return [
        i.name,
        i.category,
        i.qty,
        i.weight,
        i.weight * i.qty,
        i.value,
        i.owner,
        i.serial,
        b?.name || "",
        p?.name || "",
        b?.mode === "shipment" ? b.arrival : p?.arrival || "",
        i.needed || data.setup,
        i.critical,
        i.tested,
        i.packed,
      ];
    }),
  ];
  download(
    "ExpeditionOps-equipment.csv",
    rows.map((r) => r.map(cell).join(",")).join("\r\n"),
    "text/csv",
  );
  toast("Equipment CSV exported.");
}
function printPack() {
  const a = alerts(data, today()),
    s = stats(data);
  $("#fieldpack").innerHTML =
    `<h1>${esc(data.name)}</h1><p>${esc(data.location)} · ${when(data.start)} – ${when(data.end)}</p><p>Setup: ${when(data.setup)} · ${kg(s.weight)} including cases · Equipment value ${usd(s.value)}</p><p class="print-note">${data.demo ? "DEMO DATA · Fictional expedition. " : ""}Generated ${when(today())}. ${dirty ? "Includes changes that have not been saved in this browser." : ""} Readiness is ${s.readiness}% based on packing and task completion.</p><h2>Planning alerts (${a.length})</h2>${a.map((x) => `<p><strong>${esc(x.title)}</strong> — ${esc(x.detail)}</p>`).join("") || "<p>No current planning alerts.</p>"}<h2>Team travel & contact sheet</h2><table><thead><tr><th>Name / role</th><th>Contact</th><th>Arrival</th><th>Departure</th><th>Baggage allowance</th></tr></thead><tbody>${data.travelers.map((p) => `<tr><td>${esc(p.name)}<br>${esc(p.role)}</td><td>${esc(p.email)}</td><td>${esc(p.arrival)}</td><td>${esc(p.departure)}</td><td>${p.maxBags} bags / ${kg(p.allowance)}</td></tr>`).join("")}</tbody></table><h2>Readiness checks</h2><table><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>${data.tasks.map((t) => `<tr><td>${esc(t.title)}${t.blocking ? " (blocker)" : ""}</td><td>${esc(data.travelers.find((p) => p.id === t.assignee)?.name || "Unassigned")}</td><td>${esc(t.due)}</td><td>${t.done ? "Complete" : "Open"}</td></tr>`).join("")}</tbody></table><div class="print-break"></div><h2>Bag & shipment manifests</h2>${[
      ...data.bags,
      {
        id: "",
        name: "Unassigned equipment",
        tare: 0,
        limit: 0,
        mode: "unassigned",
      },
    ]
      .map((b) => {
        const items = data.items.filter((i) => i.bag === b.id);
        if (!items.length && b.id === "") return "";
        const p = data.travelers.find((p) => p.id === b.traveler);
        return `<h3>${esc(b.name)} · ${kg(bagWeight(data, b))}</h3><p>${b.mode === "shipment" ? "Freight" : esc(p?.name || "Carrier unassigned")} · Arrival ${when(b.mode === "shipment" ? b.arrival : p?.arrival)} · Empty case ${kg(b.tare)} · Limit ${b.limit ? kg(b.limit) : "unset"}</p><table><thead><tr><th>Item / serial</th><th>Qty</th><th>Total kg</th><th>Total USD</th><th>Owner</th><th>Tested / packed</th></tr></thead><tbody>${items.map((i) => `<tr><td>${esc(i.name)}<br>${esc(i.serial)}</td><td>${i.qty}</td><td>${(i.weight * i.qty).toFixed(1)}</td><td>${usd(i.value * i.qty)}</td><td>${esc(i.owner)}</td><td>${i.tested ? "Yes" : "No"} / ${i.packed ? "Yes" : "No"}</td></tr>`).join("")}</tbody></table>`;
      })
      .join(
        "",
      )}<h2>Bag labels</h2>${data.bags.map((b) => `<p><strong>${esc(data.name)} · ${esc(b.name)}</strong><br>Carrier: ${esc(data.travelers.find((p) => p.id === b.traveler)?.name || (b.mode === "shipment" ? "Freight" : "Unassigned"))} · Gross weight: ${kg(bagWeight(data, b))}</p>`).join("")}<p class="print-note">Planning inventory and labels. Equipment values are supplied by the team.</p>`;
  window.print();
}

function bind() {
  document
    .querySelectorAll("[data-view]")
    .forEach((el) => (el.onclick = () => go(el.dataset.view)));
  document
    .querySelectorAll("[data-edit]")
    .forEach((el) => (el.onclick = () => edit(el.dataset.edit, el.dataset.id)));
  document.querySelectorAll("[data-toggle]").forEach(
    (el) =>
      (el.onchange = async () => {
        if (busy) return;
        data[el.dataset.toggle].find((i) => i.id === el.dataset.id)[
          el.dataset.key
        ] = el.checked;
        await save();
        render();
      }),
  );
  document.querySelectorAll("[data-alert-view]").forEach(
    (el) =>
      (el.onclick = () => {
        const v = el.dataset.alertView;
        go(v);
        edit(
          v === "equipment"
            ? "items"
            : v === "team"
              ? "travelers"
              : v === "readiness"
                ? "tasks"
                : "bags",
          el.dataset.alertId,
        );
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((el) => (el.onclick = () => action(el.dataset.action)));
  $("#workspace")?.addEventListener("change", async (e) => {
    if (busy) {
      e.target.value = current;
      toast("Wait for saving to finish.");
      return;
    }
    if (
      dirty &&
      !confirm(
        "Discard unsaved changes and switch expeditions? Export a backup first.",
      )
    ) {
      e.target.value = current;
      return;
    }
    try {
      await load(e.target.value);
    } catch (err) {
      toast(err.message);
    }
  });
  $("#search")?.addEventListener("input", (e) => {
    search = e.target.value;
    $("#equipment-rows").innerHTML = equipmentRows();
    bindRows();
  });
  $("#filter")?.addEventListener("change", (e) => {
    filter = e.target.value;
    $("#equipment-rows").innerHTML = equipmentRows();
    bindRows();
  });
  $("#import-file")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 1000000) throw Error("Backup must be under 1 MB");
      const next = parseBackup(await f.text());
      if (data) {
        if (
          !confirm(
            "Replace this expedition plan with the imported backup? Export the current plan first.",
          )
        )
          return;
        data = next;
        if (await save()) {
          render();
          toast("Expedition imported and saved in this browser.");
        }
      } else {
        const out = await api("/api/expeditions", "POST", { data: next });
        await list();
        await load(out.id);
        toast("Expedition imported and saved in this browser.");
      }
    } catch (err) {
      toast(err.message);
    } finally {
      if ($("#import-file")) $("#import-file").value = "";
    }
  });
}
function bindRows() {
  document
    .querySelectorAll("#equipment-rows [data-edit]")
    .forEach((el) => (el.onclick = () => edit(el.dataset.edit, el.dataset.id)));
  document.querySelectorAll("#equipment-rows [data-toggle]").forEach(
    (el) =>
      (el.onchange = async () => {
        if (busy) return;
        data.items.find((i) => i.id === el.dataset.id)[el.dataset.key] =
          el.checked;
        await save();
        render();
      }),
  );
  setStatus();
}
async function action(a) {
  if (busy && !["backup", "csv", "fieldpack"].includes(a)) {
    toast("Wait for saving to finish.");
    return;
  }
  if (a === "demo") return create(true);
  if (a === "new") {
    if (
      dirty &&
      !confirm(
        "Create a new expedition while this one has unsaved changes? Export a backup first.",
      )
    )
      return;
    return create(false);
  }
  if (a === "backup") return backup();
  if (a === "csv") return csv();
  if (a === "fieldpack") return printPack();
  if (a === "import") $("#import-file").click();
  if (a === "retry") {
    if (await save()) {
      render();
      toast("Changes saved.");
    }
  }
  if (a === "reload") {
    if (
      dirty &&
      !confirm("Discard unsaved changes and reload? Export a backup first.")
    )
      return;
    try {
      await load(current);
    } catch (e) {
      toast(e.message);
    }
  }
}
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
(async () => {
  try {
    await list();
    if (expeditions.length) await load(expeditions[0].id);
    else render();
  } catch (e) {
    $("#app").innerHTML =
      `<main class="loading"><h1>Open ExpeditionOps</h1><p>${esc(e.message)}</p><button class="btn primary" id="retry-open">Try again</button></main>`;
    $("#retry-open")?.addEventListener("click", () => location.reload());
  }
})();
