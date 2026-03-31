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

const defaultState = {
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

    for (let fiberIndex = 0; fiberIndex < fibersPerTube; fiberIndex++) {
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
      } else if (fiberNumberInTube > 24) {
        fiber.classList.add("hash-2");
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
  fiberCountSelect.value = state.fiberCount;
  tubeSizeSelect.value = state.tubeSize;
  jumpTubeInput.value = state.jumpTube;
  jumpFiberInput.value = state.jumpFiber;
  jumpTotalInput.value = state.jumpTotal;

  fibersPerTube = parseInt(tubeSizeSelect.value);
  renderMap(parseInt(fiberCountSelect.value));
  restoreSavedSelection(state.selectedTotal);
}

function resetApp() {
  localStorage.removeItem(STORAGE_KEY);
  applyState(defaultState);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

applyState(loadState());

fiberCountSelect.addEventListener("change", () => {
  renderMap(parseInt(fiberCountSelect.value));
  updateInfoBar();
  saveState();
});

tubeSizeSelect.addEventListener("change", () => {
  fibersPerTube = parseInt(tubeSizeSelect.value);
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
  const tubeCount = Math.ceil(parseInt(fiberCountSelect.value) / fibersPerTube);

  if (!tube || !fiber || tube < 1 || tube > tubeCount || fiber < 1 || fiber > fibersPerTube) {
    alert(`Enter a tube between 1 and ${tubeCount} and a fiber between 1 and ${fibersPerTube}`);
    return;
  }

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
  const maxFibers = parseInt(fiberCountSelect.value);

  if (!total || total < 1 || total > maxFibers) {
    alert(`Enter a number between 1 and ${maxFibers}`);
    return;
  }

  const tube = Math.ceil(total / fibersPerTube);
  const fiber = ((total - 1) % fibersPerTube) + 1;

  document.querySelectorAll(".fiber").forEach(f =>
    f.classList.remove("active")
  );

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

