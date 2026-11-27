const { groups, phases, t } = JSON.parse(
  document.getElementById("guide-data").textContent,
);
const $ = (id) => document.getElementById(id);
for (const link of document.querySelectorAll(".languages a")) {
  if (location.protocol === "file:") {
    link.href = link.hreflang === "pl" ? "./pl.html" : "./index.html";
  }
  link.hash = location.hash;
  window.addEventListener("hashchange", () => { link.hash = location.hash; });
}
function setPrintExample(name, prompt) {
  $("print-skill").textContent = name;
  $("print-prompt").textContent = prompt;
}
function resetCopy(control) {
  clearTimeout(Number(control.dataset.timer));
  control.classList.remove("copied");
  const status = control.closest(".prompt").querySelector(".copy-status");
  status.textContent = "";
}
async function copyPrompt(element, control) {
  resetCopy(control);
  const prompt = element.textContent;
  const status = control.closest(".prompt").querySelector(".copy-status");
  try {
    await navigator.clipboard.writeText(prompt);
    if (element.textContent !== prompt) return;
    control.classList.add("copied");
    status.classList.add("sr");
    status.textContent = t.copied;
    control.dataset.timer = setTimeout(() => resetCopy(control), 1800);
  } catch {
    if (element.textContent !== prompt) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.classList.remove("sr");
    status.textContent = t.copyFallback;
  }
}
$("dialog-copy").onclick = () =>
  copyPrompt($("dialog-prompt"), $("dialog-copy"));
function openSkill(group, row) {
  const { name, outcome, prompt } = row;
  setPrintExample(name, prompt);
  $("dialog-group").textContent = group.name;
  $("dialog-title").textContent = name;
  $("dialog-outcome").textContent = outcome;
  $("dialog-prompt").textContent = name + " — " + prompt;
  $("dialog-doc").href =
    "https://github.com/open-mercato/skills/blob/main/docs/skills/" +
    name +
    ".md";
  resetCopy($("dialog-copy"));
  $("skill-dialog").showModal();
}
const skillDialog = $("skill-dialog");
$("dismiss").onclick = () => skillDialog.close();
function isBackdropEvent(event) {
  if (event.target !== skillDialog) return false;
  const bounds = skillDialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX >= bounds.right ||
    event.clientY < bounds.top || event.clientY >= bounds.bottom;
}
let pressedBackdrop = false;
skillDialog.onpointerdown = (event) => {
  pressedBackdrop = event.isPrimary && event.button === 0 && isBackdropEvent(event);
};
skillDialog.onpointercancel = () => { pressedBackdrop = false; };
skillDialog.onclick = (event) => {
  if (pressedBackdrop && isBackdropEvent(event)) skillDialog.close();
  pressedBackdrop = false;
};
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
let mapTheme;
try {
  mapTheme = localStorage.getItem("om-skill-map-theme");
} catch {}
function applyMapTheme() {
  const theme = ["light", "dark"].includes(mapTheme)
    ? mapTheme
    : systemTheme.matches
      ? "dark"
      : "light";
  document.documentElement.dataset.mapTheme = theme;
  const label =
    theme === "light" ? t.dark : t.light;
  $("map-theme").setAttribute("aria-label", label);
  $("map-theme").title = label;
}
$("map-theme").onclick = () => {
  mapTheme =
    document.documentElement.dataset.mapTheme === "light" ? "dark" : "light";
  try {
    localStorage.setItem("om-skill-map-theme", mapTheme);
  } catch {}
  applyMapTheme();
};
systemTheme.addEventListener("change", applyMapTheme);
applyMapTheme();
const branches = Array.from(
  document.querySelectorAll(".branch"),
  (branch, index) => {
    const group = groups[index];
    const leaves = Array.from(branch.querySelectorAll(".leaf"));
    leaves.forEach((leaf, position) => {
      leaf.onclick = () => {
        traceBranch(index, position);
        openSkill(group, group.skills[position]);
      };
      leaf.onpointerenter = () => traceBranch(index, position);
      leaf.onfocus = () => traceBranch(index, position);
    });
    const category = branch.querySelector(".branch-select");
    category.onclick = () => traceBranch(index, routeGroup === index ? routeLeaf : 0);
    return {
      branch,
      category,
      leaves,
    };
  },
);
let routeGroup = 0,
  routeLeaf = 0;
const svgNS = "http://www.w3.org/2000/svg";
function waypoint(path) {
  const line = document.createElementNS(svgNS, "path");
  line.setAttribute("d", path);
  return line;
}
function drawTree() {
  const bounds = $("wires").getBoundingClientRect();
  const hub = $("map-hub").getBoundingClientRect();
  const hubX = hub.left + hub.width / 2 - bounds.left;
  const hubY = hub.top + hub.height / 2 - bounds.top;
  const compact = matchMedia("(max-width: 900px)").matches;
  const links = document.createDocumentFragment();
  for (const entry of branches) {
    const node = entry.category.getBoundingClientRect();
    const left = node.right < hub.left;
    const direction = left ? -1 : 1;
    const startX = hubX + direction * hub.width / 2;
    const targetX = (left ? node.right : node.left) - bounds.left;
    const nodeY = node.top + node.height / 2 - bounds.top;
    const midX = (startX + targetX) / 2;
    entry.incoming = waypoint(
      `M ${startX} ${hubY} C ${midX} ${hubY}, ${midX} ${nodeY}, ${targetX} ${nodeY}`,
    );
    links.append(entry.incoming);
    entry.lines = [];
    if (compact) continue;
    const edgeX = (left ? node.left : node.right) - bounds.left;
    entry.lines = entry.leaves.map((leaf) => {
      const box = leaf.getBoundingClientRect();
      const leafX = (left ? box.right : box.left) - bounds.left;
      const leafY = box.top + box.height / 2 - bounds.top;
      const railX = (edgeX + leafX) / 2;
      const route = `M ${edgeX} ${nodeY} C ${railX} ${nodeY}, ${railX} ${leafY}, ${leafX} ${leafY}`;
      const line = waypoint(route);
      links.append(line);
      return line;
    });
  }
  $("wires").replaceChildren(links);
  traceBranch(routeGroup, routeLeaf, false);
}
function traceBranch(group, index, animate = true) {
  const pulseInFlight = $("wires").querySelector("circle");
  if (animate && pulseInFlight && routeGroup === group && routeLeaf === index) return;
  routeGroup = group;
  routeLeaf = index;
  $("wires").style.setProperty("--route-accent", getComputedStyle(branches[group].branch).getPropertyValue("--branch-accent"));
  branches.forEach((entry, position) => {
    const active = position === group;
    entry.branch.classList.toggle("active", active);
    if (matchMedia("(max-width: 900px)").matches) entry.category.setAttribute("aria-expanded", String(active));
    else entry.category.removeAttribute("aria-expanded");
    entry.incoming?.classList.toggle("lit", active);
    entry.leaves.forEach((leaf, leafIndex) => {
      leaf.classList.toggle("current", active && leafIndex === index);
      entry.lines?.[leafIndex]?.classList.toggle(
        "lit",
        active && leafIndex === index,
      );
    });
    if (active && entry.incoming) {
      $("wires").append(entry.incoming);
      if (entry.lines[index]) $("wires").append(entry.lines[index]);
    }
  });
  pulseInFlight?.remove();
  const line = branches[group].lines?.[index] ?? branches[group].incoming;
  if (
    !animate ||
    !line ||
    matchMedia("(prefers-reduced-motion:reduce)").matches
  )
    return;
  const pulse = document.createElementNS(svgNS, "circle"),
    motion = document.createElementNS(svgNS, "animateMotion");
  pulse.setAttribute("r", "3.4");
  pulse.setAttribute("fill", "var(--route-accent)");
  pulse.setAttribute("stroke", "var(--lit)");
  motion.setAttribute("path", line.getAttribute("d"));
  motion.setAttribute("dur", "1.6s");
  motion.setAttribute("begin", "indefinite");
  motion.addEventListener("endEvent", () => pulse.remove(), { once: true });
  pulse.append(motion);
  $("wires").append(pulse);
  motion.beginElement();
}
new ResizeObserver(drawTree).observe($("tree"));

const stageButtons = Array.from(document.querySelectorAll(".stage"));
let activePhase = 0;
function selectPhase(index) {
  if (index < 0 || index >= phases.length) return;
  activePhase = index;
  const phase = phases[index];
  stageButtons.forEach((node, position) => node.setAttribute("aria-pressed", index === position));
  $("prev-phase").setAttribute("aria-disabled", String(index === 0));
  $("next-phase").setAttribute("aria-disabled", String(index === phases.length - 1));
  $("phase-count").dataset.accent = stageButtons[index].dataset.accent;
  $("phase-count").textContent =
    phase.name + " / " + (index + 1) + " " + t.of + " " + phases.length;
  for (const key of ["title", "agent", "human", "result"])
    $("phase-" + key).textContent = phase[key];
  document.querySelectorAll("[data-phase-view]").forEach(view => {
    view.inert = view.dataset.phaseView !== phase.key;
  });
  $("phase-resources").inert = phase.skills.length === 0;
}
$("prev-phase").onclick = () => selectPhase(activePhase - 1);
$("next-phase").onclick = () => selectPhase(activePhase + 1);
for (const control of $("phase-skills").querySelectorAll("[data-related-skill]")) {
  const name = control.dataset.relatedSkill;
  const group = groups.find(entry => entry.skills.some(skill => skill.name === name));
  const row = group.skills.find(skill => skill.name === name);
  control.onclick = () => openSkill(group, row);
}
stageButtons.forEach((stage, index) => {
  stage.onclick = () => selectPhase(index);
});
function layoutScene() {
  const scene = $("scene");
  if (!scene.clientWidth) return;
  const width = scene.clientWidth,
    height = scene.clientHeight,
    compact = width < 920;
  const points = phases.map((phase, index) => {
    if (compact) {
      const columns = Math.ceil(phases.length / 2);
      const col = index < columns ? index : phases.length - 1 - index;
      return [(col + 0.5) / columns, index < columns ? 0.3 : 0.75];
    }
    const fraction = index / (phases.length - 1);
    return [0.095 + 0.805 * fraction, 0.72 - 0.415 * fraction];
  });
  const coords = points.map(([x, y]) => [width * x, height * y]);
  stageButtons.forEach((stage, index) => {
    stage.style.left = coords[index][0] + "px";
    stage.style.top = coords[index][1] + "px";
  });
  const paths = [
    '<defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="m0 0 5 3 -5 3z" fill="var(--muted)"/></marker></defs>',
  ];
  for (let i = 1; i < coords.length; i++) {
    const [a, b] = coords[i - 1],
      [c, d] = coords[i];
    const x = (a + c) / 2,
      y = (b + d) / 2;
    paths.push(
      '<path class="wire" d="M' +
        a +
        " " +
        b +
        " L" +
        x +
        " " +
        y +
        '" marker-end="url(#arrow)"/><path class="wire" d="M' +
        x +
        " " +
        y +
        " L" +
        c +
        " " +
        d +
        '"/>',
    );
  }
  const [startX, startY] = coords[0],
    [endX, endY] = coords.at(-1);
  if (compact) {
    paths.push(
      '<path class="return" d="M' +
        endX +
        " " +
        endY +
        " H8 V" +
        startY +
        " H" +
        startX +
        '"/>',
    );
  } else {
    const feedbackY = height - 19,
      entryX = width * 0.045,
      exitX = width * 0.974;
    const request = scene.querySelector(".request"),
      sample = scene.querySelector(".sample");
    request.style.left = startX + "px";
    const inputY = request.offsetTop + request.offsetHeight;
    const labelTop = stageButtons[0].querySelector(".stage-name").getBoundingClientRect().top
      - scene.getBoundingClientRect().top;
    const [releaseX, releaseY] =
        coords[phases.findIndex((phase) => phase.key === "Release")],
      fileY = sample.offsetTop + 14;
    paths.push(`<path class="input-wire" d="M${startX} ${inputY} V${labelTop - 3}"/>`);
    paths.push(
      '<path class="wire" d="M' +
        releaseX +
        " " +
        (releaseY + 30) +
        " V" +
        (fileY - 8) +
        " Q" +
        releaseX +
        " " +
        fileY +
        " " +
        (releaseX + 8) +
        " " +
        fileY +
        " H" +
        sample.offsetLeft +
        '"/>',
    );
    paths.push(
      '<path class="return" d="M' +
        endX +
        " " +
        endY +
        " H" +
        (exitX - 9) +
        " Q" +
        exitX +
        " " +
        endY +
        " " +
        exitX +
        " " +
        (endY + 9) +
        " V" +
        (feedbackY - 9) +
        " Q" +
        exitX +
        " " +
        feedbackY +
        " " +
        (exitX - 9) +
        " " +
        feedbackY +
        " H" +
        (entryX + 9) +
        " Q" +
        entryX +
        " " +
        feedbackY +
        " " +
        entryX +
        " " +
        (feedbackY - 9) +
        " V" +
        (startY + 8) +
        " Q" +
        entryX +
        " " +
        startY +
        " " +
        (entryX + 8) +
        " " +
        startY +
        " H" +
        startX +
        '"/>',
    );
    paths.push(
      '<text x="' +
        width * 0.5 +
        '" y="' +
        (feedbackY - 20) +
        '" class="wire-caption" text-anchor="middle">' + t.feedback + '</text>',
    );
  }
  $("routes").innerHTML = paths.join("");
}
new ResizeObserver(layoutScene).observe($("scene"));
selectPhase(0);

const wordmark = document.querySelector(".footer-wordmark");
new IntersectionObserver(([entry]) => {
  wordmark.classList.toggle("in-view", entry.isIntersecting);
}).observe(wordmark);

$("print").onclick = (event) => {
  event.preventDefault();
  window.print();
};
