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
const pageTitle = document.getElementById("page-title");
const pageKicker = document.getElementById("page-kicker");
const pages = Array.from(document.querySelectorAll(".page"));
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const cableSizes = Array.from(fiberCountSelect.options).map(option => parseInt(option.value));
const tubeSizes = Array.from(tubeSizeSelect.options).map(option => parseInt(option.value));
const pageOrder = [
  { id: "page-1", title: "Color Optics" },
  { id: "page-2", title: "Fiber Color Code" },
  { id: "page-3", title: "Twisted Pair Color Code" }
];

let currentPageId = "page-1";

const defaultState = {
  currentPage: "page-1",
  fiberCount: fiberCountSelect.value,
  tubeSize: tubeSizeSelect.value,
  jumpTube: "",
  jumpFiber: "",
  jumpTotal: "",
  selectedTotal: null
};

function getCurrentState() {
  const activeFiber = document.querySelector(".fiber.active");

  return {
    currentPage: currentPageId,
    fiberCount: fiberCountSelect.value,
    tubeSize: tubeSizeSelect.value,
    jumpTube: jumpTubeInput.value,
    jumpFiber: jumpFiberInput.value,
    jumpTotal: jumpTotalInput.value,
    selectedTotal: activeFiber ? activeFiber.dataset.total : null
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

  setCurrentPage(state.currentPage, false);
  fiberCountSelect.value = state.fiberCount;
  jumpTubeInput.value = state.jumpTube;
  jumpFiberInput.value = state.jumpFiber;
  jumpTotalInput.value = state.jumpTotal;

  syncTubeSizeOptions(totalFibers, state.tubeSize);
  renderMap(totalFibers);
  restoreSavedSelection(state.selectedTotal);
}

function configureMap(totalFibers, preferredTubeSize) {
  fiberCountSelect.value = String(totalFibers);
  syncTubeSizeOptions(totalFibers, preferredTubeSize);
  renderMap(totalFibers);
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

