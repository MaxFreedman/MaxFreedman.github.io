export const uid = () => crypto.randomUUID();
export function seed() {
  return {
    name: "North Reef field expedition",
    location: "Demo · South Pacific",
    start: "2026-11-16",
    end: "2026-12-04",
    setup: "2026-11-16",
    demo: true,
    travelers: [
      {
        id: "p1",
        name: "Alex Morgan",
        role: "Expedition lead",
        email: "",
        arrival: "2026-11-16",
        departure: "2026-12-04",
        allowance: 46,
        maxBags: 2,
      },
      {
        id: "p2",
        name: "Jamie Chen",
        role: "Field technician",
        email: "",
        arrival: "2026-11-18",
        departure: "2026-12-04",
        allowance: 23,
        maxBags: 1,
      },
      {
        id: "p3",
        name: "Sam Rivera",
        role: "Research coordinator",
        email: "",
        arrival: "2026-11-16",
        departure: "2026-12-04",
        allowance: 46,
        maxBags: 2,
      },
    ],
    bags: [
      {
        id: "b1",
        name: "Case 01 · Instruments",
        traveler: "p1",
        mode: "traveler",
        arrival: "",
        tare: 5.2,
        limit: 23,
      },
      {
        id: "b2",
        name: "Case 02 · Power & cables",
        traveler: "p2",
        mode: "traveler",
        arrival: "",
        tare: 4,
        limit: 23,
      },
      {
        id: "b3",
        name: "Case 03 · Shelter",
        traveler: "p3",
        mode: "traveler",
        arrival: "",
        tare: 3.5,
        limit: 23,
      },
      {
        id: "b4",
        name: "Freight crate · Support",
        traveler: "",
        mode: "shipment",
        arrival: "2026-11-15",
        tare: 8,
        limit: 60,
      },
    ],
    items: [
      {
        id: "i1",
        name: "Field receiver",
        category: "Electronics",
        qty: 2,
        weight: 4.1,
        value: 2400,
        serial: "DEMO-001 / 002",
        owner: "Research team",
        bag: "b1",
        needed: "2026-11-16",
        critical: true,
        tested: true,
        packed: true,
      },
      {
        id: "i2",
        name: "Power supplies",
        category: "Power",
        qty: 2,
        weight: 3.2,
        value: 350,
        serial: "",
        owner: "Team pool",
        bag: "b2",
        needed: "2026-11-16",
        critical: true,
        tested: true,
        packed: false,
      },
      {
        id: "i3",
        name: "Cable & adapter kit",
        category: "Electronics",
        qty: 1,
        weight: 5.5,
        value: 260,
        serial: "",
        owner: "Alex",
        bag: "b2",
        needed: "2026-11-16",
        critical: true,
        tested: false,
        packed: false,
      },
      {
        id: "i4",
        name: "Portable shelter",
        category: "Camp",
        qty: 1,
        weight: 12,
        value: 750,
        serial: "",
        owner: "Sam",
        bag: "b3",
        needed: "2026-11-16",
        critical: false,
        tested: true,
        packed: true,
      },
      {
        id: "i5",
        name: "Water sampling kit",
        category: "Research",
        qty: 1,
        weight: 2.6,
        value: 480,
        serial: "",
        owner: "Sam",
        bag: "",
        needed: "2026-11-17",
        critical: true,
        tested: true,
        packed: false,
      },
      {
        id: "i6",
        name: "Tool roll",
        category: "Tools",
        qty: 1,
        weight: 9.2,
        value: 420,
        serial: "",
        owner: "Team pool",
        bag: "b4",
        needed: "2026-11-16",
        critical: false,
        tested: true,
        packed: true,
      },
      {
        id: "i7",
        name: "Spare antenna supports",
        category: "Structures",
        qty: 4,
        weight: 1.5,
        value: 110,
        serial: "",
        owner: "Team pool",
        bag: "b4",
        needed: "2026-11-16",
        critical: false,
        tested: true,
        packed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Confirm evacuation cover for every traveler",
        assignee: "p1",
        due: "2026-11-01",
        blocking: true,
        done: false,
      },
      {
        id: "t2",
        title: "Verify entry documents and permits",
        assignee: "p3",
        due: "2026-10-25",
        blocking: true,
        done: true,
      },
      {
        id: "t3",
        title: "Complete bag inventory and photograph cases",
        assignee: "p2",
        due: "2026-11-10",
        blocking: true,
        done: false,
      },
      {
        id: "t4",
        title: "Confirm accommodation and local transfer",
        assignee: "p1",
        due: "2026-10-30",
        blocking: false,
        done: true,
      },
      {
        id: "t5",
        title: "Test complete power and cable setup",
        assignee: "p2",
        due: "2026-11-08",
        blocking: true,
        done: false,
      },
      {
        id: "t6",
        title: "Print manifests and emergency contact sheet",
        assignee: "p3",
        due: "2026-11-14",
        blocking: false,
        done: false,
      },
    ],
  };
}
export function blank() {
  return {
    name: "New expedition",
    location: "",
    start: "",
    end: "",
    setup: "",
    demo: false,
    travelers: [],
    bags: [],
    items: [],
    tasks: [],
  };
}
const dateOK = (s) =>
  s === "" ||
  (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s);
export function validateData(d) {
  if (!d || typeof d !== "object") throw Error("Invalid expedition");
  const text = (s, max = 400) => {
    if (typeof s !== "string" || s.length > max) throw Error("Invalid text");
    return s;
  };
  const date = (s) => {
    if (typeof s !== "string" || !dateOK(s)) throw Error("Invalid date");
    return s;
  };
  const n = (v, max = 1e7) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
      throw Error("Invalid number");
    return v;
  };
  const bool = (v) => {
    if (typeof v !== "boolean") throw Error("Invalid status");
    return v;
  };
  const list = (a, fn) => {
    if (!Array.isArray(a) || a.length > 1000) throw Error("Invalid list");
    const out = a.map(fn);
    if (new Set(out.map((x) => x.id)).size !== out.length)
      throw Error("Duplicate identifiers");
    return out;
  };
  const out = {
    name: text(d.name, 120),
    location: text(d.location, 200),
    start: date(d.start),
    end: date(d.end),
    setup: date(d.setup),
    demo: bool(d.demo),
    travelers: list(d.travelers, (p) => ({
      id: text(p.id, 100),
      name: text(p.name, 120),
      role: text(p.role, 120),
      email: text(p.email, 200),
      arrival: date(p.arrival),
      departure: date(p.departure),
      allowance: n(p.allowance, 1000),
      maxBags: n(p.maxBags, 100),
    })),
    bags: list(d.bags, (b) => ({
      id: text(b.id, 100),
      name: text(b.name, 120),
      traveler: text(b.traveler, 100),
      mode: ["traveler", "shipment"].includes(b.mode)
        ? b.mode
        : (() => {
            throw Error("Invalid transport");
          })(),
      arrival: date(b.arrival),
      tare: n(b.tare, 10000),
      limit: n(b.limit, 10000),
    })),
    items: list(d.items, (i) => ({
      id: text(i.id, 100),
      name: text(i.name, 200),
      category: text(i.category, 100),
      qty: n(i.qty, 10000),
      weight: n(i.weight, 10000),
      value: n(i.value),
      serial: text(i.serial, 300),
      owner: text(i.owner, 120),
      bag: text(i.bag, 100),
      needed: date(i.needed),
      critical: bool(i.critical),
      tested: bool(i.tested),
      packed: bool(i.packed),
    })),
    tasks: list(d.tasks, (t) => ({
      id: text(t.id, 100),
      title: text(t.title, 300),
      assignee: text(t.assignee, 100),
      due: date(t.due),
      blocking: bool(t.blocking),
      done: bool(t.done),
    })),
  };
  if (!out.name.trim()) throw Error("Expedition name is required");
  if (out.start && out.end && out.end < out.start)
    throw Error("End date precedes start");
  const pids = new Set(out.travelers.map((p) => p.id)),
    bids = new Set(out.bags.map((b) => b.id));
  if (
    out.bags.some((b) => b.traveler && !pids.has(b.traveler)) ||
    out.items.some((i) => i.bag && !bids.has(i.bag)) ||
    out.tasks.some((t) => t.assignee && !pids.has(t.assignee))
  )
    throw Error("Unknown assignment");
  return out;
}
export const bagWeight = (d, b) =>
  Math.round(
    (b.tare +
      d.items
        .filter((i) => i.bag === b.id)
        .reduce((s, i) => s + i.weight * i.qty, 0)) *
      100,
  ) / 100;
export function alerts(d, today = new Date().toISOString().slice(0, 10)) {
  const a = [];
  for (const i of d.items) {
    const b = d.bags.find((b) => b.id === i.bag),
      p = b && d.travelers.find((p) => p.id === b.traveler);
    const arrival = b?.mode === "shipment" ? b.arrival : p?.arrival;
    const needed = i.needed || d.setup;
    if (!b)
      a.push({
        kind: i.critical ? "critical" : "warning",
        title: `${i.name} has no bag`,
        detail: "Assign it to a case or shipment.",
        view: "equipment",
        id: i.id,
      });
    else if (i.critical && !arrival)
      a.push({
        kind: "critical",
        title: `Arrival unknown: ${i.name}`,
        detail: "Assign a traveler with an arrival date, or a shipment ETA.",
        view: "bags",
        id: b.id,
      });
    else if (arrival && needed && arrival > needed)
      a.push({
        kind: i.critical ? "critical" : "warning",
        title: `${i.name} arrives too late`,
        detail: `Needed ${needed} · arrives ${arrival}${p ? " with " + p.name : ""}.`,
        view: "equipment",
        id: i.id,
      });
    if (i.critical && !i.tested)
      a.push({
        kind: "warning",
        title: `Test ${i.name}`,
        detail: "Critical equipment is not marked tested.",
        view: "equipment",
        id: i.id,
      });
  }
  for (const b of d.bags) {
    const w = bagWeight(d, b);
    if (b.limit > 0 && w > b.limit)
      a.push({
        kind: "critical",
        title: `${b.name} is overweight`,
        detail: `${w.toFixed(1)} kg packed · ${b.limit} kg limit.`,
        view: "bags",
        id: b.id,
      });
    if (b.mode === "traveler" && !b.traveler)
      a.push({
        kind: "warning",
        title: `${b.name} needs a carrier`,
        detail: "Assign a traveler before departure.",
        view: "bags",
        id: b.id,
      });
  }
  for (const p of d.travelers) {
    const bs = d.bags.filter(
        (b) => b.mode === "traveler" && b.traveler === p.id,
      ),
      w = bs.reduce((s, b) => s + bagWeight(d, b), 0);
    if (w > p.allowance)
      a.push({
        kind: "critical",
        title: `${p.name} exceeds baggage allowance`,
        detail: `${w.toFixed(1)} kg assigned · ${p.allowance} kg allowed.`,
        view: "team",
        id: p.id,
      });
    if (bs.length > p.maxBags)
      a.push({
        kind: "critical",
        title: `Too many bags for ${p.name}`,
        detail: `${bs.length} assigned · ${p.maxBags} allowed.`,
        view: "team",
        id: p.id,
      });
  }
  for (const t of d.tasks)
    if (!t.done && t.due && t.due < today)
      a.push({
        kind: t.blocking ? "critical" : "warning",
        title: `Overdue: ${t.title}`,
        detail: `Due ${t.due}.`,
        view: "readiness",
        id: t.id,
      });
  return a;
}
export function stats(d) {
  const done = d.tasks.filter((t) => t.done).length,
    packed = d.items.filter((i) => i.packed).length;
  return {
    weight:
      d.bags.reduce((s, b) => s + bagWeight(d, b), 0) +
      d.items.filter((i) => !i.bag).reduce((s, i) => s + i.weight * i.qty, 0),
    value: d.items.reduce((s, i) => s + i.value * i.qty, 0),
    packed,
    done,
    readiness:
      d.items.length + d.tasks.length
        ? Math.round(
            ((done + packed) / (d.items.length + d.tasks.length)) * 100,
          )
        : 0,
  };
}
