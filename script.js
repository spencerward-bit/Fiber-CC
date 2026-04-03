const tubeSizeSelect = document.getElementById("tube-size");
let fibersPerTube = parseInt(tubeSizeSelect.value);

const tubeColors = [
  "Blue", "Orange", "Green", "Brown",
  "Slate", "White", "Red", "Black",
  "Yellow", "Violet", "Rose", "Aqua"
];

const fiberColors = [...tubeColors];

const fiberColorMap = {
  Blue: "#0057B8",
  Orange: "#FF7A00",
  Green: "#009E49",
  Brown: "#6E3B1E",
  Slate: "#7A7A7A",
  White: "#F2F2F2",
  Red: "#D50000",
  Black: "#000000",
  Yellow: "#FFD500",
  Violet: "#8A2BE2",
  Rose: "#FF4F9A",
  Aqua: "#00B3B8"
};

const darkColors = new Set(["Blue", "Brown", "Slate", "Red", "Black", "Violet"]);
const STORAGE_KEY = "fiberColorMapState";

const map = document.getElementById("fiber-map");
const infoBar = document.getElementById("info-bar");
const fiberCountSelect = document.getElementById("fiber-count");
const jumpTubeInput = document.getElementById("jump-tube");
const jumpFiberInput = document.getElementById("jump-fiber");
const jumpBtn = document.getElementById("jump-btn");
const jumpTotalInput = document.getElementById("jump-total");
const jumpTotalBtn = document.getElementById("jump-total-btn");
const resetBtn = document.getElementById("reset-btn");
const pairCountSelect = document.getElementById("pair-count");
const jumpBinderInput = document.getElementById("jump-binder");
const jumpPairInput = document.getElementById("jump-pair");
const jumpPairBtn = document.getElementById("jump-pair-btn");
const jumpTotalPairInput = document.getElementById("jump-total-pair");
const jumpTotalPairBtn = document.getElementById("jump-total-pair-btn");
const resetPairBtn = document.getElementById("reset-pair-btn");
const pairMap = document.getElementById("pair-map");
const pairInfoBar = document.getElementById("pair-info-bar");
const ethernetCategorySelect = document.getElementById("ethernet-category");
const ethernetTitle = document.getElementById("ethernet-title");
const ethernetSummary = document.getElementById("ethernet-summary");
const ethernetDataRate = document.getElementById("ethernet-data-rate");
const ethernetBandwidth = document.getElementById("ethernet-bandwidth");
const ethernetDistance = document.getElementById("ethernet-distance");
const ethernetNote = document.getElementById("ethernet-note");
const ethernetDiagramTitle = document.getElementById("ethernet-diagram-title");
const ethernetDiagram = document.getElementById("ethernet-diagram");
const coaxTypeSelect = document.getElementById("coax-type");
const coaxTitle = document.getElementById("coax-title");
const coaxSummary = document.getElementById("coax-summary");
const coaxDataRate = document.getElementById("coax-data-rate");
const coaxBandwidth = document.getElementById("coax-bandwidth");
const coaxDistance = document.getElementById("coax-distance");
const coaxNote = document.getElementById("coax-note");
const coaxDiagramTitle = document.getElementById("coax-diagram-title");
const coaxDiagram = document.getElementById("coax-diagram");
const pageTitle = document.getElementById("page-title");
const pageKicker = document.getElementById("page-kicker");
const pages = Array.from(document.querySelectorAll(".page"));
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const cableSizes = Array.from(fiberCountSelect.options).map(option => parseInt(option.value));
const tubeSizes = Array.from(tubeSizeSelect.options).map(option => parseInt(option.value));
const pairCounts = Array.from(pairCountSelect.options).map(option => parseInt(option.value));
const pageOrder = [
  { id: "page-1", title: "Color Optics" },
  { id: "page-2", title: "Fiber Color Code" },
  { id: "page-3", title: "Twisted Pair Color Code" },
  { id: "page-4", title: "Ethernet" },
  { id: "page-5", title: "Coax" }
];

const pairMajorColors = ["White", "Red", "Black", "Yellow", "Violet"];
const pairMinorColors = ["Blue", "Orange", "Green", "Brown", "Slate"];
const twistedPairColorMap = {
  White: "#F4F4F4",
  Blue: "#1F3CFF",
  Orange: "#FFAA00",
  Green: "#39FF14",
  Brown: "#A23A32",
  Slate: "#7E8A95",
  Red: "#FF2B2B",
  Black: "#121212",
  Yellow: "#FFF135",
  Violet: "#E88CFF"
};

const ethernetPinColorsB = [
  { pin: 1, label: "White/Orange", pair: "Pair 2", color: "#F4F4F4", text: "#111111" },
  { pin: 2, label: "Orange", pair: "Pair 2", color: "#FFAA00", text: "#111111" },
  { pin: 3, label: "White/Green", pair: "Pair 3", color: "#F4F4F4", text: "#111111" },
  { pin: 4, label: "Blue", pair: "Pair 1", color: "#1F3CFF", text: "#FFFFFF" },
  { pin: 5, label: "White/Blue", pair: "Pair 1", color: "#F4F4F4", text: "#111111" },
  { pin: 6, label: "Green", pair: "Pair 3", color: "#39FF14", text: "#111111" },
  { pin: 7, label: "White/Brown", pair: "Pair 4", color: "#F4F4F4", text: "#111111" },
  { pin: 8, label: "Brown", pair: "Pair 4", color: "#A23A32", text: "#FFFFFF" }
];

const ethernetPinColorsA = [
  { pin: 1, label: "White/Green", pair: "Pair 3", color: "#F4F4F4", text: "#111111" },
  { pin: 2, label: "Green", pair: "Pair 3", color: "#39FF14", text: "#111111" },
  { pin: 3, label: "White/Orange", pair: "Pair 2", color: "#F4F4F4", text: "#111111" },
  { pin: 4, label: "Blue", pair: "Pair 1", color: "#1F3CFF", text: "#FFFFFF" },
  { pin: 5, label: "White/Blue", pair: "Pair 1", color: "#F4F4F4", text: "#111111" },
  { pin: 6, label: "Orange", pair: "Pair 2", color: "#FFAA00", text: "#111111" },
  { pin: 7, label: "White/Brown", pair: "Pair 4", color: "#F4F4F4", text: "#111111" },
  { pin: 8, label: "Brown", pair: "Pair 4", color: "#A23A32", text: "#FFFFFF" }
];

const ethernetCatalog = {
  cat1: {
    title: "CAT 1",
    summary: "Legacy voice-grade cabling used for plain old telephone service and very low speed signaling.",
    dataRate: "Up to 1 Mbps",
    bandwidth: "1 MHz",
    distance: "About 100 m for voice/low-speed legacy use",
    note: "CAT 1 is not intended for modern Ethernet. This legacy diagram shows a simple single-pair voice path instead of an RJ45 Ethernet pinout.",
    diagramTitle: "Legacy Single-Pair Voice/Data",
    diagramType: "legacy",
    legacyPairs: [
      { title: "Pair A", text: "Tip: Green | Ring: Red" },
      { title: "Pair B", text: "Spare / station dependent" }
    ]
  },
  cat2: {
    title: "CAT 2",
    summary: "Early low-speed balanced pair cable used for Token Ring and other pre-fast-Ethernet data systems.",
    dataRate: "Up to 4 Mbps",
    bandwidth: "4 MHz",
    distance: "About 100 m in legacy low-speed use",
    note: "CAT 2 predates modern structured cabling. Use this as a simple legacy pair reference, not a modern Ethernet recommendation.",
    diagramTitle: "Legacy Two-Pair Reference",
    diagramType: "legacy",
    legacyPairs: [
      { title: "Pair 1", text: "Tip: White/Blue | Ring: Blue" },
      { title: "Pair 2", text: "Tip: White/Orange | Ring: Orange" }
    ]
  },
  cat3: {
    title: "CAT 3",
    summary: "10BASE-T era cable that can support early Ethernet and voice on structured cabling runs.",
    dataRate: "10 Mbps",
    bandwidth: "16 MHz",
    distance: "100 m",
    note: "Shown with a simple T568B-style 8P8C pinout for field reference.",
    diagramTitle: "T568B 8P8C Pinout",
    diagramType: "pinout"
  },
  cat4: {
    title: "CAT 4",
    summary: "Legacy structured cabling primarily associated with 16 Mbps Token Ring installations.",
    dataRate: "16 Mbps",
    bandwidth: "20 MHz",
    distance: "100 m",
    note: "Not common in current Ethernet work, but often referenced in older building cabling.",
    diagramTitle: "T568B 8P8C Pinout",
    diagramType: "pinout"
  },
  cat5: {
    title: "CAT 5",
    summary: "Structured cabling for early Fast Ethernet deployments and voice/data cross-connects.",
    dataRate: "100 Mbps",
    bandwidth: "100 MHz",
    distance: "100 m",
    note: "This reference uses the common T568B pin order.",
    diagramTitle: "T568B 8P8C Pinout",
    diagramType: "pinout"
  },
  cat5e: {
    title: "CAT 5e",
    summary: "Enhanced Category 5 cable commonly used for Gigabit Ethernet in homes and commercial spaces.",
    dataRate: "1 Gbps",
    bandwidth: "100 MHz",
    distance: "100 m",
    note: "Still one of the most common Ethernet categories in the field.",
    diagramTitle: "T568B 8P8C Pinout",
    diagramType: "pinout"
  },
  cat6: {
    title: "CAT 6",
    summary: "Higher-performance copper cabling used for Gigabit and short-run 10 Gigabit Ethernet.",
    dataRate: "1 Gbps at 100 m, 10 Gbps to about 55 m",
    bandwidth: "250 MHz",
    distance: "100 m typical, 55 m at 10 Gbps",
    note: "Shielding is optional; termination quality matters more at higher speeds.",
    diagramTitle: "T568B 8P8C Pinout",
    diagramType: "pinout"
  },
  cat6a: {
    title: "CAT 6a",
    summary: "Augmented Category 6 cable designed for full-distance 10 Gigabit Ethernet.",
    dataRate: "10 Gbps",
    bandwidth: "500 MHz",
    distance: "100 m",
    note: "A common enterprise choice when 10 Gig copper is required over full channel length.",
    diagramTitle: "T568B 8P8C Pinout",
    diagramType: "pinout"
  },
  cat7: {
    title: "CAT 7",
    summary: "Heavily shielded cable class used in specialty installations with higher frequency performance.",
    dataRate: "10 Gbps",
    bandwidth: "600 MHz",
    distance: "100 m",
    note: "Often discussed with GG45/TERA-style systems even though field use varies by region.",
    diagramTitle: "Shielded 4-Pair Reference",
    diagramType: "pinout"
  },
  cat7a: {
    title: "CAT 7a",
    summary: "Extended shielded twisted-pair class intended for higher frequency headroom than CAT 7.",
    dataRate: "10 Gbps",
    bandwidth: "1000 MHz",
    distance: "100 m",
    note: "Usually referenced in specialized shielded systems rather than mainstream office copper.",
    diagramTitle: "Shielded 4-Pair Reference",
    diagramType: "pinout"
  },
  cat8: {
    title: "CAT 8",
    summary: "Short-reach data center copper for high-speed 25G and 40G Ethernet channels.",
    dataRate: "25/40 Gbps",
    bandwidth: "2000 MHz",
    distance: "30 m",
    note: "CAT 8 is intended for short links, typically top-of-rack to switch/server runs.",
    diagramTitle: "Shielded 4-Pair RJ45 Reference",
    diagramType: "pinout"
  },
  "cat8.1": {
    title: "CAT 8.1",
    summary: "Class I implementation of CAT 8 using RJ45-compatible connectivity and short high-speed links.",
    dataRate: "25/40 Gbps",
    bandwidth: "2000 MHz",
    distance: "30 m",
    note: "CAT 8.1 is the RJ45-oriented flavor of CAT 8 for short data center channels.",
    diagramTitle: "Shielded 4-Pair RJ45 Reference",
    diagramType: "pinout"
  },
  "cat8.2": {
    title: "CAT 8.2",
    summary: "Class II implementation of CAT 8 typically associated with specialty shielded connectors and short 25/40G channels.",
    dataRate: "25/40 Gbps",
    bandwidth: "2000 MHz",
    distance: "30 m",
    note: "CAT 8.2 is a shielded high-frequency short-link system, usually not used for standard office patching.",
    diagramTitle: "Shielded 4-Pair Reference",
    diagramType: "pinout"
  }
};

const coaxCatalog = {
  rg59: {
    title: "RG-59",
    summary: "Smaller 75 ohm coax commonly seen in older CCTV, legacy video, and shorter low-frequency drops.",
    dataRate: "Good for SD/HD video and short DOCSIS/video runs",
    bandwidth: "Up to about 1 GHz",
    distance: "Best on shorter runs, often under 225 ft",
    note: "Use when flexibility matters more than long reach. Signal loss climbs faster than RG-6 on longer runs.",
    diagramTitle: "75 Ohm Legacy Drop Layout",
    impedance: "75 ohm",
    connectors: "BNC or F-type",
    center: "Copper-clad steel or solid copper center conductor",
    dielectric: "Foam dielectric",
    shield: "Single braid with foil on many builds",
    jacket: "PVC indoor jacket"
  },
  rg6: {
    title: "RG-6",
    summary: "The most common 75 ohm residential coax for cable TV, satellite, and broadband modem drops.",
    dataRate: "Common for DOCSIS broadband, TV, and MoCA home networking",
    bandwidth: "Up to about 3 GHz",
    distance: "Often 150 to 300 ft before loss becomes a bigger design concern",
    note: "This is the usual field choice for indoor and outdoor house drops and structured residential coax runs.",
    diagramTitle: "75 Ohm Broadband Drop Layout",
    impedance: "75 ohm",
    connectors: "F-type compression",
    center: "Copper-clad steel center conductor",
    dielectric: "Gas-injected foam dielectric",
    shield: "Foil plus braid shield",
    jacket: "PVC or PE jacket"
  },
  rg6qs: {
    title: "RG-6 Quad Shield",
    summary: "RG-6 with extra shielding layers for noisier environments, stronger ingress rejection, and cleaner modem/video performance.",
    dataRate: "Broadband, satellite, TV, and MoCA in higher-noise environments",
    bandwidth: "Up to about 3 GHz",
    distance: "Similar to RG-6, often 150 to 300 ft depending on frequency and splitters",
    note: "Quad shield helps when interference is a problem, but it is a little stiffer to terminate.",
    diagramTitle: "Quad Shield 75 Ohm Layout",
    impedance: "75 ohm",
    connectors: "F-type compression",
    center: "Copper-clad steel center conductor",
    dielectric: "Gas-injected foam dielectric",
    shield: "Dual foil plus dual braid",
    jacket: "PVC or PE jacket"
  },
  rg11: {
    title: "RG-11",
    summary: "Larger 75 ohm coax used when lower loss is needed over longer outdoor or building-entry runs.",
    dataRate: "Broadband, TV, and long-feed distribution where lower attenuation matters",
    bandwidth: "Up to about 3 GHz",
    distance: "Often chosen for 300 to 500+ ft runs before active equipment",
    note: "Better long-run performance than RG-6, but it is bulkier and less forgiving to bend and terminate.",
    diagramTitle: "Long-Reach 75 Ohm Layout",
    impedance: "75 ohm",
    connectors: "F-type or hardline transition fittings",
    center: "Copper-clad steel or solid copper center conductor",
    dielectric: "Foam dielectric",
    shield: "Foil plus heavy braid",
    jacket: "UV-rated PE or PVC jacket"
  },
  rg58: {
    title: "RG-58",
    summary: "Flexible 50 ohm coax used for legacy radio, instrumentation, and lighter-duty RF patching.",
    dataRate: "Lower-speed RF/data links and bench or instrument connections",
    bandwidth: "Up to about 1 GHz",
    distance: "Usually kept short, often under 50 to 100 ft at higher frequencies",
    note: "This is a 50 ohm cable, so it is not the same use case as CATV-style 75 ohm coax.",
    diagramTitle: "50 Ohm Flexible RF Layout",
    impedance: "50 ohm",
    connectors: "BNC, PL-259, SMA, or N-type",
    center: "Stranded or solid copper center conductor",
    dielectric: "Solid polyethylene dielectric",
    shield: "Single braid shield",
    jacket: "PVC jacket"
  },
  rg8: {
    title: "RG-8",
    summary: "Larger 50 ohm coax used for radio systems and longer RF feeds than RG-58 can support comfortably.",
    dataRate: "RF feedline for radio systems and higher-power applications",
    bandwidth: "Up to about 2 GHz",
    distance: "Commonly used on medium-length RF runs, often 100 to 200+ ft",
    note: "Lower loss than RG-58, but heavier and less convenient in tight spaces.",
    diagramTitle: "50 Ohm Medium Feedline Layout",
    impedance: "50 ohm",
    connectors: "PL-259, N-type, or UHF connectors",
    center: "Stranded or solid copper center conductor",
    dielectric: "Foam or solid dielectric",
    shield: "Heavy braid or braid plus foil",
    jacket: "PVC or PE jacket"
  },
  rg174: {
    title: "RG-174",
    summary: "Very small 50 ohm coax for short pigtails, compact RF devices, and tight-space internal routing.",
    dataRate: "Short patch leads, antennas, GPS, and compact RF devices",
    bandwidth: "Up to about 1 GHz",
    distance: "Best on very short runs, often under 20 to 30 ft",
    note: "Useful where size matters, but attenuation is much higher than larger coax types.",
    diagramTitle: "Miniature 50 Ohm Pigtail Layout",
    impedance: "50 ohm",
    connectors: "SMA, SMB, MCX, or custom pigtails",
    center: "Stranded center conductor",
    dielectric: "Solid dielectric",
    shield: "Single braid shield",
    jacket: "Thin PVC jacket"
  },
  hardline500: {
    title: "0.500 Hardline",
    summary: "Rigid low-loss trunk or feeder coax used in outside plant, headend, and distribution systems where attenuation must stay low.",
    dataRate: "High-capacity broadband RF distribution and plant transport",
    bandwidth: "Up to about 1.2 GHz and beyond by system design",
    distance: "Hundreds to thousands of feet with proper amplification design",
    note: "This is plant cable rather than a quick patch lead. Connector prep and bonding are more specialized.",
    diagramTitle: "Hardline Trunk Cable Layout",
    impedance: "75 ohm",
    connectors: "Seizure screws, hardline connectors, and taps",
    center: "Solid copper-clad aluminum center conductor",
    dielectric: "Air-spaced or foam dielectric",
    shield: "Corrugated aluminum outer conductor",
    jacket: "Flooded or UV-rated PE jacket"
  }
};

let currentPageId = "page-1";

const defaultState = {
  currentPage: "page-1",
  fiberCount: fiberCountSelect.value,
  tubeSize: tubeSizeSelect.value,
  jumpTube: "",
  jumpFiber: "",
  jumpTotal: "",
  selectedTotal: null,
  pairCount: pairCountSelect.value,
  jumpBinder: "",
  jumpPair: "",
  jumpTotalPair: "",
  selectedTotalPair: null,
  ethernetCategory: ethernetCategorySelect.value,
  coaxType: coaxTypeSelect.value
};

function getCurrentState() {
  const activeFiber = document.querySelector(".fiber.active");
  const activePair = document.querySelector(".pair-card.active");

  return {
    currentPage: currentPageId,
    fiberCount: fiberCountSelect.value,
    tubeSize: tubeSizeSelect.value,
    jumpTube: jumpTubeInput.value,
    jumpFiber: jumpFiberInput.value,
    jumpTotal: jumpTotalInput.value,
    selectedTotal: activeFiber ? activeFiber.dataset.total : null,
    pairCount: pairCountSelect.value,
    jumpBinder: jumpBinderInput.value,
    jumpPair: jumpPairInput.value,
    jumpTotalPair: jumpTotalPairInput.value,
    selectedTotalPair: activePair ? activePair.dataset.totalPair : null,
    ethernetCategory: ethernetCategorySelect.value,
    coaxType: coaxTypeSelect.value
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getCurrentState()));
}

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return { ...defaultState };
  }

  try {
    return { ...defaultState, ...JSON.parse(savedState) };
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return { ...defaultState };
  }
}

function updateInfoBar(message = "Tap a fiber") {
  infoBar.textContent = message;
}

function setCurrentPage(pageId, shouldSave = true) {
  const activePage = pageOrder.find(page => page.id === pageId) ?? pageOrder[0];
  currentPageId = activePage.id;

  pages.forEach(page => {
    page.classList.toggle("active", page.id === activePage.id);
  });

  tabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.pageTarget === activePage.id);
  });

  pageTitle.textContent = activePage.title;
  pageKicker.textContent = `Page ${pageOrder.findIndex(page => page.id === activePage.id) + 1} of ${pageOrder.length}`;
  document.title = activePage.title;

  if (shouldSave) {
    saveState();
  }
}

function findSmallestSizeAtLeast(sizes, minimum) {
  return sizes.find(size => size >= minimum) ?? null;
}

function toRomanNumeral(value) {
  const numerals = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"]
  ];

  let remaining = value;
  let result = "";

  numerals.forEach(([amount, numeral]) => {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  });

  return result;
}

function syncTubeSizeOptions(totalFibers, preferredTubeSize = tubeSizeSelect.value) {
  const options = Array.from(tubeSizeSelect.options);
  let fallbackValue = options[0].value;

  options.forEach(option => {
    const optionValue = parseInt(option.value);
    const isValid = optionValue <= totalFibers;

    option.disabled = !isValid;
    option.hidden = !isValid;

    if (isValid) {
      fallbackValue = option.value;
    }
  });

  const preferredOption = options.find(option =>
    option.value === String(preferredTubeSize) && !option.disabled
  );

  tubeSizeSelect.value = preferredOption ? preferredOption.value : fallbackValue;
  fibersPerTube = parseInt(tubeSizeSelect.value);
}

function closeAllTubes() {
  document.querySelectorAll(".tube.open").forEach(tube =>
    tube.classList.remove("open")
  );
}

function clearActiveFibers() {
  document.querySelectorAll(".fiber").forEach(fiber =>
    fiber.classList.remove("active")
  );
}

function selectFiber(target) {
  if (!target) {
    return null;
  }

  const tubeDiv = target.closest(".tube");
  const tube = target.dataset.tube;
  const fiber = target.dataset.fiber;
  const total = target.dataset.total;

  clearActiveFibers();
  closeAllTubes();
  tubeDiv.classList.add("open");
  target.classList.add("active");
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  jumpTubeInput.value = tube;
  jumpFiberInput.value = fiber;
  jumpTotalInput.value = total;

  updateInfoBar(`Total Fiber ${total} - Tube ${tube}, Fiber ${fiber}`);
  saveState();
  return target;
}

function updatePairInfoBar(message = "Tap a pair") {
  pairInfoBar.textContent = message;
}

function renderEthernetDiagram(entry) {
  ethernetTitle.textContent = entry.title;
  ethernetSummary.textContent = entry.summary;
  ethernetDataRate.textContent = entry.dataRate;
  ethernetBandwidth.textContent = entry.bandwidth;
  ethernetDistance.textContent = entry.distance;
  ethernetNote.textContent = entry.note;
  ethernetDiagramTitle.textContent = entry.diagramTitle;

  if (entry.diagramType === "legacy") {
    ethernetDiagram.innerHTML = `
      <div class="ethernet-legacy">
        ${entry.legacyPairs.map(pair => `
          <article class="ethernet-legacy-pair">
            <strong>${pair.title}</strong>
            <span>${pair.text}</span>
          </article>
        `).join("")}
      </div>
    `;
    return;
  }

  ethernetDiagram.innerHTML = `
    <div class="ethernet-pinout-compare">
      <section class="ethernet-pinout-block">
        <h4>T568A</h4>
        <div class="ethernet-pinout">
          ${ethernetPinColorsA.map(pin => `
            <article class="ethernet-pin" style="background:${pin.color};color:${pin.text}">
              <span class="ethernet-pin-number">Pin ${pin.pin}</span>
              <span class="ethernet-pin-color">${pin.label}</span>
              <span class="ethernet-pin-pair">${pin.pair}</span>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="ethernet-pinout-block">
        <h4>T568B</h4>
        <div class="ethernet-pinout">
          ${ethernetPinColorsB.map(pin => `
            <article class="ethernet-pin" style="background:${pin.color};color:${pin.text}">
              <span class="ethernet-pin-number">Pin ${pin.pin}</span>
              <span class="ethernet-pin-color">${pin.label}</span>
              <span class="ethernet-pin-pair">${pin.pair}</span>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderCoaxDiagram(entry) {
  coaxTitle.textContent = entry.title;
  coaxSummary.textContent = entry.summary;
  coaxDataRate.textContent = entry.dataRate;
  coaxBandwidth.textContent = entry.bandwidth;
  coaxDistance.textContent = entry.distance;
  coaxNote.textContent = entry.note;
  coaxDiagramTitle.textContent = entry.diagramTitle;

  coaxDiagram.innerHTML = `
    <div class="coax-stack">
      <article class="coax-layer coax-jacket">
        <span class="coax-layer-name">Outer Jacket</span>
        <strong>${entry.jacket}</strong>
      </article>
      <article class="coax-layer coax-shield">
        <span class="coax-layer-name">Shield</span>
        <strong>${entry.shield}</strong>
      </article>
      <article class="coax-layer coax-dielectric">
        <span class="coax-layer-name">Dielectric</span>
        <strong>${entry.dielectric}</strong>
      </article>
      <article class="coax-layer coax-center">
        <span class="coax-layer-name">Center Conductor</span>
        <strong>${entry.center}</strong>
      </article>
    </div>
    <div class="coax-meta-grid">
      <article class="coax-meta-card">
        <span class="coax-layer-name">Impedance</span>
        <strong>${entry.impedance}</strong>
      </article>
      <article class="coax-meta-card">
        <span class="coax-layer-name">Common Connectors</span>
        <strong>${entry.connectors}</strong>
      </article>
    </div>
  `;
}

function getBinderLabel(binderNumber) {
  const major = pairMajorColors[Math.floor((binderNumber - 1) / pairMinorColors.length)];
  const minor = pairMinorColors[(binderNumber - 1) % pairMinorColors.length];
  return `${major}/${minor}`;
}

function getPairColors(pairNumber) {
  const major = pairMajorColors[Math.floor((pairNumber - 1) / pairMinorColors.length)];
  const minor = pairMinorColors[(pairNumber - 1) % pairMinorColors.length];

  return {
    tipLabel: `${major}/${minor}`,
    ringLabel: minor,
    tipColor: twistedPairColorMap[major],
    ringColor: twistedPairColorMap[minor]
  };
}

function closeAllBinders() {
  document.querySelectorAll(".binder.open").forEach(binder =>
    binder.classList.remove("open")
  );
}

function clearActivePairs() {
  document.querySelectorAll(".pair-card").forEach(pair =>
    pair.classList.remove("active")
  );
}

function selectPair(target) {
  if (!target) {
    return null;
  }

  const binder = target.dataset.binder;
  const pair = target.dataset.pair;
  const totalPair = target.dataset.totalPair;
  const binderDiv = target.closest(".binder");

  clearActivePairs();
  closeAllBinders();
  binderDiv.classList.add("open");
  target.classList.add("active");
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  jumpBinderInput.value = binder;
  jumpPairInput.value = pair;
  jumpTotalPairInput.value = totalPair;

  updatePairInfoBar(`Total Pair ${totalPair} - Binder ${binder}, Pair ${pair}`);
  saveState();
  return target;
}

function renderPairMap(totalPairs) {
  pairMap.innerHTML = "";
  const binderCount = Math.ceil(totalPairs / 25);

  for (let binderIndex = 0; binderIndex < binderCount; binderIndex++) {
    const binderNumber = binderIndex + 1;
    const binderLabel = getBinderLabel(binderNumber);
    const binderMajorColor = binderLabel.split("/")[0];

    const binderDiv = document.createElement("div");
    binderDiv.className = "binder";
    binderDiv.style.borderColor = twistedPairColorMap[binderMajorColor];

    const title = document.createElement("div");
    title.className = "binder-title";
    title.textContent = `Binder ${binderNumber} - ${binderLabel}`;
    title.style.background = twistedPairColorMap[binderMajorColor];
    title.style.color = binderMajorColor === "White" || binderMajorColor === "Yellow" ? "#111111" : "#FFFFFF";

    title.onclick = () => {
      const isOpen = binderDiv.classList.contains("open");
      closeAllBinders();
      if (!isOpen) {
        binderDiv.classList.add("open");
      }
    };

    const grid = document.createElement("div");
    grid.className = "pair-grid";

    const pairsInThisBinder = Math.min(25, totalPairs - binderIndex * 25);

    for (let pairIndex = 0; pairIndex < pairsInThisBinder; pairIndex++) {
      const pairNumber = pairIndex + 1;
      const totalPair = binderIndex * 25 + pairNumber;
      const colors = getPairColors(pairNumber);

      const pairCard = document.createElement("button");
      pairCard.type = "button";
      pairCard.className = "pair-card";
      pairCard.dataset.binder = binderNumber;
      pairCard.dataset.pair = pairNumber;
      pairCard.dataset.totalPair = totalPair;
      pairCard.innerHTML = `
        <span class="pair-number">${pairNumber}</span>
        <span class="pair-wire-wrap">
          <span class="pair-wire left" style="background:${colors.tipColor}">
            <span class="wire-label">1</span>
          </span>
          <span class="pair-wire right" style="background:${colors.ringColor}">
            <span class="wire-label">2</span>
          </span>
        </span>
        <span class="pair-meta">
          <strong>Tip: ${colors.tipLabel}</strong>
          Ring ${colors.ringLabel}
        </span>
      `;

      pairCard.onclick = () => {
        selectPair(pairCard);
      };

      grid.appendChild(pairCard);
    }

    binderDiv.appendChild(title);
    binderDiv.appendChild(grid);
    pairMap.appendChild(binderDiv);
  }
}

function restoreSavedPairSelection(selectedTotalPair) {
  if (!selectedTotalPair) {
    updatePairInfoBar();
    return;
  }

  const target = document.querySelector(`.pair-card[data-total-pair="${selectedTotalPair}"]`);

  if (!target) {
    updatePairInfoBar();
    saveState();
    return;
  }

  selectPair(target);
}

function renderMap(totalFibers) {
  map.innerHTML = "";

  const tubeCount = Math.ceil(totalFibers / fibersPerTube);

  for (let tubeIndex = 0; tubeIndex < tubeCount; tubeIndex++) {
    const tubeColor = tubeColors[tubeIndex % tubeColors.length];
    const tubeTextColor = darkColors.has(tubeColor) ? "#FFFFFF" : "#111111";

    const tubeDiv = document.createElement("div");
    tubeDiv.className = "tube";
    tubeDiv.style.borderColor = fiberColorMap[tubeColor];

    const title = document.createElement("div");
    title.className = "tube-title";
    title.style.background = fiberColorMap[tubeColor];
    title.style.color = tubeTextColor;
    title.textContent = `Tube ${tubeIndex + 1} - ${tubeColor}`;

    // Tube hash marks
    const tubeNumber = tubeIndex + 1;
    if (tubeNumber > 12 && tubeNumber <= 24) {
      title.classList.add("hash-1");
    } else if (tubeNumber > 24) {
      title.classList.add("hash-2");
    }

    title.onclick = () => {
      const isOpen = tubeDiv.classList.contains("open");
      closeAllTubes();
      if (!isOpen) tubeDiv.classList.add("open");
    };

    tubeDiv.appendChild(title);

    let row = null;

    const fibersInThisTube = Math.min(
      fibersPerTube,
      totalFibers - tubeIndex * fibersPerTube
    );

    for (let fiberIndex = 0; fiberIndex < fibersInThisTube; fiberIndex++) {
      if (fiberIndex % 12 === 0) {
        row = document.createElement("div");
        row.className = "fiber-row";
        tubeDiv.appendChild(row);
      }

      const fiberColor = fiberColors[fiberIndex % fiberColors.length];

      const fiber = document.createElement("div");
      fiber.className = `fiber color-${fiberColor.toLowerCase()}`;
      fiber.dataset.tube = tubeIndex + 1;
      fiber.dataset.fiber = fiberIndex + 1;
      fiber.dataset.total =
        tubeIndex * fibersPerTube + fiberIndex + 1;

      fiber.style.background = fiberColorMap[fiberColor];
      fiber.textContent = fiberIndex + 1;

      // Fiber hash marks
      const fiberNumberInTube = fiberIndex + 1;
      if (fiberNumberInTube > 12 && fiberNumberInTube <= 24) {
        fiber.classList.add("hash-1");
      } else if (fiberNumberInTube > 24 && fiberNumberInTube <= 36) {
        fiber.classList.add("hash-2");
      } else if (fiberNumberInTube > 36) {
        const rowNumber = Math.ceil(fiberNumberInTube / 12);
        fiber.classList.add("roman-marker");
        fiber.dataset.rowMarker = toRomanNumeral(rowNumber);
      }

      fiber.onclick = () => {
        selectFiber(fiber);
      };

      row.appendChild(fiber);
    }

    map.appendChild(tubeDiv);
  }
}

function restoreSavedSelection(selectedTotal) {
  if (!selectedTotal) {
    updateInfoBar();
    return;
  }

  const target = document.querySelector(`.fiber[data-total="${selectedTotal}"]`);

  if (!target) {
    updateInfoBar();
    saveState();
    return;
  }

  selectFiber(target);
}

function applyState(state) {
  const totalFibers = parseInt(state.fiberCount);
  const totalPairs = parseInt(state.pairCount);

  setCurrentPage(state.currentPage, false);
  fiberCountSelect.value = state.fiberCount;
  jumpTubeInput.value = state.jumpTube;
  jumpFiberInput.value = state.jumpFiber;
  jumpTotalInput.value = state.jumpTotal;
  pairCountSelect.value = state.pairCount;
  jumpBinderInput.value = state.jumpBinder;
  jumpPairInput.value = state.jumpPair;
  jumpTotalPairInput.value = state.jumpTotalPair;
  ethernetCategorySelect.value = state.ethernetCategory;
  coaxTypeSelect.value = state.coaxType;

  syncTubeSizeOptions(totalFibers, state.tubeSize);
  renderMap(totalFibers);
  restoreSavedSelection(state.selectedTotal);
  renderPairMap(totalPairs);
  restoreSavedPairSelection(state.selectedTotalPair);
  renderEthernetDiagram(ethernetCatalog[state.ethernetCategory] ?? ethernetCatalog.cat1);
  renderCoaxDiagram(coaxCatalog[state.coaxType] ?? coaxCatalog.rg59);
}

function configureMap(totalFibers, preferredTubeSize) {
  fiberCountSelect.value = String(totalFibers);
  syncTubeSizeOptions(totalFibers, preferredTubeSize);
  renderMap(totalFibers);
}

function configurePairMap(totalPairs) {
  pairCountSelect.value = String(totalPairs);
  renderPairMap(totalPairs);
}

function resetApp() {
  localStorage.removeItem(STORAGE_KEY);
  applyState(defaultState);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

applyState(loadState());

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    setCurrentPage(button.dataset.pageTarget);
  });
});

fiberCountSelect.addEventListener("change", () => {
  const totalFibers = parseInt(fiberCountSelect.value);

  syncTubeSizeOptions(totalFibers);
  renderMap(totalFibers);
  updateInfoBar();
  saveState();
});

tubeSizeSelect.addEventListener("change", () => {
  syncTubeSizeOptions(parseInt(fiberCountSelect.value), tubeSizeSelect.value);
  renderMap(parseInt(fiberCountSelect.value));
  updateInfoBar();
  saveState();
});

jumpTubeInput.addEventListener("input", saveState);
jumpFiberInput.addEventListener("input", saveState);
jumpTotalInput.addEventListener("input", saveState);
jumpBinderInput.addEventListener("input", saveState);
jumpPairInput.addEventListener("input", saveState);
jumpTotalPairInput.addEventListener("input", saveState);

jumpBtn.addEventListener("click", () => {
  const tube = parseInt(jumpTubeInput.value);
  const fiber = parseInt(jumpFiberInput.value);

  if (!tube || !fiber || tube < 1 || fiber < 1) {
    alert("Enter a valid tube number and fiber number.");
    return;
  }

  const nextTubeSize = findSmallestSizeAtLeast(tubeSizes, fiber);

  if (!nextTubeSize) {
    alert("That fiber number is larger than the available tube sizes.");
    return;
  }

  const requiredTotal = (tube - 1) * nextTubeSize + fiber;
  const nextCableSize = findSmallestSizeAtLeast(cableSizes, requiredTotal);

  if (!nextCableSize) {
    alert("That tube and fiber combination is larger than the available cable sizes.");
    return;
  }

  configureMap(nextCableSize, nextTubeSize);

  const target = document.querySelector(
    `.fiber[data-tube="${tube}"][data-fiber="${fiber}"]`
  );

  if (!target) {
    alert("That fiber does not exist");
    return;
  }

  jumpTotalInput.value = target.dataset.total;
  selectFiber(target);
});

jumpTotalBtn.addEventListener("click", () => {
  const total = parseInt(jumpTotalInput.value);
  const nextCableSize = findSmallestSizeAtLeast(cableSizes, total);
  const selectedTubeSize = parseInt(tubeSizeSelect.value);

  if (!total || total < 1) {
    alert("Enter a valid total fiber number.");
    return;
  }

  if (!nextCableSize) {
    alert("That total fiber number is larger than the available cable sizes.");
    return;
  }

  const preferredTubeSize = selectedTubeSize || 12;
  configureMap(nextCableSize, preferredTubeSize);

  const tube = Math.ceil(total / fibersPerTube);
  const fiber = ((total - 1) % fibersPerTube) + 1;
  const target = document.querySelector(
    `.fiber[data-tube="${tube}"][data-fiber="${fiber}"]`
  );

  if (!target) {
    alert("That fiber does not exist");
    return;
  }

  selectFiber(target);
});

resetBtn.addEventListener("click", resetApp);

pairCountSelect.addEventListener("change", () => {
  configurePairMap(parseInt(pairCountSelect.value));
  updatePairInfoBar();
  saveState();
});

jumpPairBtn.addEventListener("click", () => {
  const binder = parseInt(jumpBinderInput.value);
  const pair = parseInt(jumpPairInput.value);

  if (!binder || !pair || binder < 1 || pair < 1 || pair > 25) {
    alert("Enter a valid binder number and a pair number between 1 and 25.");
    return;
  }

  const totalPair = (binder - 1) * 25 + pair;
  const nextPairCount = findSmallestSizeAtLeast(pairCounts, totalPair);

  if (!nextPairCount) {
    alert("That binder and pair combination is larger than the available pair counts.");
    return;
  }

  configurePairMap(nextPairCount);

  const target = document.querySelector(
    `.pair-card[data-binder="${binder}"][data-pair="${pair}"]`
  );

  if (!target) {
    alert("That pair does not exist.");
    return;
  }

  selectPair(target);
});

jumpTotalPairBtn.addEventListener("click", () => {
  const totalPair = parseInt(jumpTotalPairInput.value);

  if (!totalPair || totalPair < 1) {
    alert("Enter a valid total pair number.");
    return;
  }

  const nextPairCount = findSmallestSizeAtLeast(pairCounts, totalPair);

  if (!nextPairCount) {
    alert("That total pair number is larger than the available pair counts.");
    return;
  }

  configurePairMap(nextPairCount);

  const binder = Math.ceil(totalPair / 25);
  const pair = ((totalPair - 1) % 25) + 1;
  const target = document.querySelector(
    `.pair-card[data-binder="${binder}"][data-pair="${pair}"]`
  );

  if (!target) {
    alert("That pair does not exist.");
    return;
  }

  selectPair(target);
});

resetPairBtn.addEventListener("click", () => {
  pairCountSelect.value = defaultState.pairCount;
  jumpBinderInput.value = "";
  jumpPairInput.value = "";
  jumpTotalPairInput.value = "";
  renderPairMap(parseInt(defaultState.pairCount));
  updatePairInfoBar();
  saveState();
});

ethernetCategorySelect.addEventListener("change", () => {
  renderEthernetDiagram(ethernetCatalog[ethernetCategorySelect.value]);
  saveState();
});

coaxTypeSelect.addEventListener("change", () => {
  renderCoaxDiagram(coaxCatalog[coaxTypeSelect.value]);
  saveState();
});

