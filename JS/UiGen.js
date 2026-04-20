// GLOBAL VARIABLE TO TRACK CURRENT EDITABLE SCHEME
window.currentEditableScheme = null;

// UTILITY FUNCTIONS
function getOptimalTextColor(bg) {
  const b = normalizeHex(bg) || "#000000";
  return contrastRatio(b, "#000000") > contrastRatio(b, "#FFFFFF") ? "black" : "white";
}

// DISPLAY FUNCTIONS
function filterErrorsByTheme(errors, theme) {
  if (!errors) return null;
  const filtered = {
    critical: errors.critical?.filter((e) => e.theme === theme) || [],
    warnings: errors.warnings?.filter((e) => e.theme === theme) || [],
    notices: errors.notices?.filter((e) => e.theme === theme) || [],
  };
  if (filtered.critical.length > 0 || filtered.warnings.length > 0 || filtered.notices.length > 0) {
    return filtered;
  }
  return null;
}

function displayColorTokens(collection) {
  const container = document.getElementById("rawColorsContainer");

  container.classList.add("color-system-updating");
  const fragment = document.createDocumentFragment();

  // Create Panels
  const rawPanel = document.createElement("div");
  rawPanel.id = "panel-colorRamps";
  rawPanel.classList.add("tab-panel");
  rawPanel.appendChild(createRawSection(collection.colorRamps));

  const lightPanel = document.createElement("div");
  lightPanel.id = "panel-tokens-light";
  lightPanel.classList.add("tab-panel");
  const lightErrors = filterErrorsByTheme(collection.errors, "light");
  if (lightErrors) lightPanel.appendChild(createErrorSection(lightErrors));
  lightPanel.appendChild(createThemeSection(collection.colorTokens.light, "Light"));

  const darkPanel = document.createElement("div");
  darkPanel.id = "panel-tokens-dark";
  darkPanel.classList.add("tab-panel");
  const darkErrors = filterErrorsByTheme(collection.errors, "dark");
  if (darkErrors) darkPanel.appendChild(createErrorSection(darkErrors));
  darkPanel.appendChild(createThemeSection(collection.colorTokens.dark, "Dark"));

  // Restore Active Tab and toggles Dark Mode Body class
  const activeTabBtn = document.querySelector(".tab-btn.active");
  const activeTargetId = activeTabBtn ? activeTabBtn.dataset.target : "panel-colorRamps";

  if (activeTargetId === "panel-colorRamps") rawPanel.classList.add("active");
  if (activeTargetId === "panel-tokens-light") lightPanel.classList.add("active");
  if (activeTargetId === "panel-tokens-dark") {
    darkPanel.classList.add("active");
    document.body.classList.add("app-dark-mode");
  } else {
    document.body.classList.remove("app-dark-mode");
  }

  fragment.appendChild(rawPanel);
  fragment.appendChild(lightPanel);
  fragment.appendChild(darkPanel);

  container.innerHTML = "";
  container.appendChild(fragment);

  // Setup tab click listeners efficiently if not already set
  if (!window.tabListenersSet) {
    const tabsContainer = document.querySelector(".tabs-navigation");
    if (tabsContainer) {
      tabsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn) return;

        // Update buttons
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Update panels
        const targetId = btn.dataset.target;
        document.querySelectorAll(".tab-panel").forEach((p) => {
          p.classList.remove("active");
          p.classList.remove("animate-in");
        });

        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.classList.add("active");
          // Trigger reflow to ensure animation runs when clicking tabs
          void targetPanel.offsetWidth;
          targetPanel.classList.add("animate-in");
        }

        // Toggle UI Dark Mode
        if (targetId === "panel-tokens-dark") {
          document.body.classList.add("app-dark-mode");
        } else {
          document.body.classList.remove("app-dark-mode");
        }
      });
      window.tabListenersSet = true;
    }
  }

  requestAnimationFrame(() => {
    container.classList.remove("color-system-updating");
  });
}

function createErrorSection(errors) {
  const createListHTML = (arr) =>
    arr
      .map((e) => {
        let ctxArray = [];
        if (e.color) ctxArray.push(`Group: <strong>${e.color.toUpperCase()}</strong>`);
        if (e.role) ctxArray.push(`Role: <strong>${e.role}</strong>`);
        if (e.variation) ctxArray.push(`Var: <strong>${e.variation}</strong>`);

        let prefixHTML = ctxArray.length ? `<span style="opacity:0.85; margin-right:8px;">[ ${ctxArray.join(" | ")} ]</span>` : "";

        return `<div class="error-item">${prefixHTML}${e.error || e.warning || e.notice}</div>`;
      })
      .join("");

  const section = document.createElement("div");
  section.className = "errors-section";
  section.innerHTML = `
    <div class="errors-header">
      <h4 class="errors-header__title">⚠️ Warnings & Errors</h4>
      <button class="errors-toggle collapsed"><</button>
    </div>
    <div class="errors-content custom-scrollbar">
      <div class="error-category">
        <div class="error-category__title">Critical (${errors.critical?.length || 0})</div>
        ${createListHTML(errors.critical || [])}
      </div>
      <div class="error-category">
        <div class="error-category__title">Warnings (${errors.warnings?.length || 0})</div>
        ${createListHTML(errors.warnings || [])}
      </div>
      <div class="error-category">
        <div class="error-category__title">Notices (${errors.notices?.length || 0})</div>
        ${createListHTML(errors.notices || [])}
      </div>
    </div>
  `;

  const header = section.querySelector(".errors-header");
  const content = section.querySelector(".errors-content");
  const toggle = section.querySelector(".errors-toggle");

  header.addEventListener("click", () => {
    const isCollapsed = toggle.classList.contains("collapsed");
    toggle.classList.toggle("collapsed", !isCollapsed);
    content.classList.toggle("expanded", isCollapsed);
  });

  return section;
}

function createRawSection(colorRamps) {
  const rawHTML = Object.entries(colorRamps)
    .map(([colorGroup, weights]) => {
      const swatchesHTML = Object.entries(weights)
        .map(([weight, data]) => {
          if (!data?.value) return "";
          const colorValue = normalizeHex(data.value) || "#000000";
          const textColor = getOptimalTextColor(colorValue);
          return `
          <div class="color-swatch" style="background-color:${colorValue}; color:${textColor}">
            <div class="swatch-info">
              <div class="swatch-hex" data-tooltip="Click to copy hex" data-copy="${colorValue}">
                ${colorValue}
              </div>
              <div class="swatch-weight" data-tooltip="Click to copy name" data-copy="${data.stepName}">
                ${data.stepName} (${data.shortName})
              </div>
              <div class="contrast-pills-row">
                <div class="contrast-pill contrast-pill--light">
                  <span class="pill-icon">☀️</span>
                  <span class="pill-text">${(data.contrast.light.ratio || 0).toFixed(2)} - ${data.contrast.light.rating}</span>
                </div>
                <div class="contrast-pill contrast-pill--dark">
                  <span class="pill-icon">🌙</span>
                  <span class="pill-text">${(data.contrast.dark.ratio || 0).toFixed(2)} - ${data.contrast.dark.rating}</span>
                </div>
              </div>
            </div>
          </div>
        `;
        })
        .join("");

      return `
        <div class="color-group">
          <h3 class="color-group__title">${colorGroup.toUpperCase()}</h3>
          <div class="swatches-grid">${swatchesHTML}</div>
        </div>
      `;
    })
    .join("");

  const section = document.createElement("div");
  section.className = "raw-colors-section";
  section.innerHTML = rawHTML;

  return section;
}

function createThemeSection(colorTokens, theme) {
  const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);

  const contextualHTML = Object.entries(colorTokens)
    .map(([colorGroup, roles]) => {
      if (!roles || Object.keys(roles).length === 0) {
        return `
          <div class="contextual-group">
            <h4 class="contextual-group__title">${colorGroup}</h4>
            <p>No roles generated</p>
          </div>
        `;
      }

      const rolesHTML = Object.entries(roles)
        .map(([role, variations]) => {
          if (!variations || Object.keys(variations).length === 0) return "";

          const variationsHTML = Object.entries(variations)
            .map(([variation, data]) => {
              if (!data?.value) return "";
              const colorValue = normalizeHex(data.value);
              const textColor = getOptimalTextColor(colorValue);
              return `
                <div class="color-token" style="background-color:${colorValue}; color:${textColor}">
                  <div class="swatch-info">
                    <div class="swatch-hex" data-tooltip="Click to copy hex" data-copy="${colorValue}">
                      ${colorValue}
                    </div>
                    <div class="swatch-weight" data-tooltip="Click to copy name" data-copy="${data.tknName}">
                      ${data.tknName}
                    </div>
                    <div class="token-ref"> Ref: ${data.tknRef}</div>
                    <div class="contrast-pills-row">
                      <div class="contrast-pill ${theme === "light" ? "contrast-pill--light" : "contrast-pill--dark"}">
                        <span class="pill-icon">${theme === "light" ? "☀️" : "🌙"}</span>
                        <span class="pill-text">${(data.contrast.ratio || 0).toFixed(2)} - ${data.contrast.rating}</span>
                      </div>
                    </div>
                    ${data.isAdjusted ? '<div class="token-adjustment" style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Adjusted</div>' : ""}
                  </div>
                </div>
              `;
            })
            .join("");

          // Get display name from the first variation
          const firstVar = Object.values(variations)[0];
          const displayRoleName = firstVar?.role || role;

          return variationsHTML
            ? `
              <div class="role-group">
                <h5 class="role-group-dark__title">${displayRoleName}</h5>
                <div class="variations-grid">${variationsHTML}</div>
              </div>
            `
            : "";
        })
        .join("");
      let className = theme === "dark" ? "contextual-group-dark" : "contextual-group";

      return rolesHTML
        ? `
          <div class="${className}">
            <h4 class="${className}__title">${colorGroup.toUpperCase()}</h4>
            ${rolesHTML}
          </div>
        `
        : "";
    })
    .join("");

  const section = document.createElement("div");
  section.className = `theme-section ${theme}-theme`;
  section.innerHTML = `
    <h4 class="raw-colors-section__title">${themeName} Theme - Contextual Tokens</h4>
    ${contextualHTML}
  `;

  return section;
}

// CONTROL PANEL FUNCTIONS
function createColorInputs(colorScheme, onUpdate) {
  const targetContainer = document.getElementById("colorInputs");
  if (!targetContainer) return;

  // Clear container
  targetContainer.innerHTML = "";

  // ----- Basic Settings -----
  const basicSection = createSection("Basic Settings");

  basicSection.appendChild(createInput("name", "System Name", colorScheme.name));
  basicSection.appendChild(createInput("colorSteps", "Weight Count", colorScheme.colorSteps, "number"));
  basicSection.appendChild(createInput("rampGenMode", "Ramp Generation Mode", colorScheme.rampGenMode || "Linear", "select", ["Linear", "Balanced"]));
  // ----- Background Colors -----
  basicSection.appendChild(createColorInput("modes.0.bg", "Light Theme Background", colorScheme.modes[0].bg || "FFFFFF"));
  basicSection.appendChild(createColorInput("modes.1.bg", "Dark Theme Background", colorScheme.modes[1].bg || "000000"));
  targetContainer.appendChild(basicSection);

  // ----- Color Groups -----
  targetContainer.appendChild(createColorGroupsSection(colorScheme));

  // ----- Roles -----
  targetContainer.appendChild(createRolesSection(colorScheme));

  // ----- INPUT HANDLER (ONCE) -----
  if (!targetContainer.dataset.hasListener) {
    let updateTimeout;
    targetContainer.addEventListener("input", (e) => {
      const target = e.target;
      const path = target.dataset.path;
      if (!path) return;

      const pathParts = path.split(".");
      const rawVal = target.value;
      const type = target.type;

      if (updateTimeout) clearTimeout(updateTimeout);

      updateTimeout = setTimeout(() => {
        const activeScheme = window.currentEditableScheme;
        if (!activeScheme) return;

        // Update the scheme
        if (type === "text" && target.classList.contains("color-text")) {
          const normalized = normalizeHex(rawVal);
          if (!normalized) return;
          updateColorScheme(activeScheme, pathParts, normalized.replace("#", ""));
        } else if (type === "number") {
          const n = rawVal === "" ? 0 : Number(rawVal);
          updateColorScheme(activeScheme, pathParts, Number.isFinite(n) ? n : 0);
        } else if (type === "color") {
          updateColorScheme(activeScheme, pathParts, rawVal.replace("#", ""));
        } else {
          updateColorScheme(activeScheme, pathParts, rawVal);
        }

        // Let the onUpdate callback handle rendering (it already does)
        if (typeof onUpdate === "function") onUpdate(activeScheme);
      }, 350);
    });
    targetContainer.dataset.hasListener = "true";
  }
}

function createColorGroupsSection(colorScheme) {
  const colorsSection = createSection("Color Groups");

  // Create add button
  const addButton = document.createElement("button");
  addButton.className = "add-color-group-btn";
  addButton.textContent = "+ Add";
  addButton.addEventListener("click", () => {
    const newGroup = {
      name: `color${colorScheme.colors.length + 1}`,
      shortName: `C${colorScheme.colors.length + 1}`,
      value: "000000",
    };
    colorScheme.colors.push(newGroup);
    // Recreate the entire controls section
    createColorInputs(colorScheme, (updated) => {
      window.currentEditableScheme = updated;
      const output = variableMaker(updated);
      displayColorTokens(output);
    });
  });
  colorsSection.appendChild(addButton);

  // Create existing color groups
  colorScheme.colors.forEach((group, index) => {
    colorsSection.appendChild(createColorGroupInput(group, index, colorScheme));
  });

  return colorsSection;
}

function createColorGroupInput(group, index, colorScheme) {
  const div = document.createElement("div");
  div.className = "color-group-control";

  div.innerHTML = `
    <div class="color-group-header">
      <input type="text" class="header-editable-input" value="${group.name}" data-path="colors.${index}.name" placeholder="Group Name">
      <button class="delete-group-btn" data-index="${index}">×</button>
    </div>
    <div class="input-group">
      <label class="input-group__label">Short Name</label>
      <input type="text" class="input-group__control" value="${group.shortName}" data-path="colors.${index}.shortName">
    </div>
    <div class="input-group color-input">
      <label class="input-group__label">Color Value</label>
      <div class="color-input-wrapper">
        <input type="color" value="#${group.value}" data-path="colors.${index}.value" class="input-group__control color-picker">
        <input type="text" value="${group.value}" data-path="colors.${index}.value" class="input-group__control color-text" placeholder="Hex color">
      </div>
    </div>
  `;

  setupColorInputSync(div);

  // Add delete button handler
  const deleteBtn = div.querySelector(".delete-group-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.dataset.index);

      // Remove the group from the color scheme
      colorScheme.colors.splice(idx, 1);

      // Create a fresh copy to ensure reactivity
      const updatedScheme = JSON.parse(JSON.stringify(colorScheme));
      window.currentEditableScheme = updatedScheme;

      // Recreate the entire controls section with updated scheme
      createColorInputs(updatedScheme, (newUpdatedScheme) => {
        window.currentEditableScheme = newUpdatedScheme;
        const output = variableMaker(newUpdatedScheme);
        displayColorTokens(output);
      });

      // Immediately update the token display
      const output = variableMaker(updatedScheme);
      displayColorTokens(output);
    });
  }

  return div;
}

function createColorInput(path, label, value) {
  const div = document.createElement("div");
  div.className = "input-group color-input";
  div.innerHTML = `
    <label class="input-group__label">${label}</label>
    <div class="color-input-wrapper">
      <input type="color" value="#${value}" data-path="${path}" class="input-group__control color-picker">
      <input type="text" value="${value}" data-path="${path}" class="input-group__control color-text" placeholder="${label}">
    </div>
  `;
  setupColorInputSync(div);
  return div;
}

function setupColorInputSync(container) {
  const colorPicker = container.querySelector(".color-picker");
  const colorText = container.querySelector(".color-text");

  if (colorPicker && colorText) {
    colorPicker.addEventListener("input", (e) => {
      const hexValue = e.target.value.replace("#", "");
      colorText.value = hexValue.toUpperCase();
    });

    colorText.addEventListener("input", (e) => {
      let hexValue = e.target.value.replace("#", "").toUpperCase();
      if (/^[0-9A-F]{6}$/.test(hexValue)) {
        colorPicker.value = "#" + hexValue;
      }
    });
  }
}

function createRolesSection(colorScheme) {
  const rolesSection = createSection("Roles Configuration");

  // Create add button
  const addButton = document.createElement("button");
  addButton.className = "add-color-group-btn";
  addButton.textContent = "+ Add Role";
  addButton.addEventListener("click", () => {
    const roleId = `role${Object.keys(colorScheme.roles).length + 1}`;
    colorScheme.roles[roleId] = {
      name: "New Role",
      shortName: "nr",
      minContrast: 4.5,
      spread: 2,
    };
    // Recreate the entire controls section
    createColorInputs(colorScheme, (updated) => {
      window.currentEditableScheme = updated;
      const output = variableMaker(updated);
      displayColorTokens(output);
    });
  });
  rolesSection.appendChild(addButton);

  for (const [roleKey, role] of Object.entries(colorScheme.roles)) {
    const roleDiv = document.createElement("div");
    const roleInputs = document.createElement("div");

    roleInputs.className = "color-group-control";
    roleDiv.classList.add("role-control-group");

    roleDiv.innerHTML = `
      <div class="role-control-header">
        <input type="text" class="header-editable-input" value="${role.name}" data-path="roles.${roleKey}.name" placeholder="Role Name">
        <button class="delete-group-btn" data-role="${roleKey}">×</button>
      </div>
    `;

    // Min contrast input
    const minContrastInput = createInput(`roles.${roleKey}.minContrast`, "Min Contrast", role.minContrast, "number");
    roleInputs.appendChild(minContrastInput);

    // Spread input
    const spreadInput = createInput(`roles.${roleKey}.spread`, "Spread", role.spread, "number");
    roleInputs.appendChild(spreadInput);

    // Short name input
    const shortNameInput = createInput(`roles.${roleKey}.shortName`, "Short Name", role.shortName);
    roleInputs.appendChild(shortNameInput);

    roleDiv.appendChild(roleInputs);

    // Add delete button handler for roles
    const deleteBtn = roleDiv.querySelector(".delete-group-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const rKey = e.target.dataset.role;

        // Remove the role from the color scheme
        delete colorScheme.roles[rKey];

        // IMPORTANT: Create a fresh copy to ensure reactivity
        const updatedScheme = JSON.parse(JSON.stringify(colorScheme));
        window.currentEditableScheme = updatedScheme;

        // Recreate the entire controls section with updated scheme
        createColorInputs(updatedScheme, (newUpdatedScheme) => {
          window.currentEditableScheme = newUpdatedScheme;
          const output = variableMaker(newUpdatedScheme);
          displayColorTokens(output);
        });

        // Also immediately update the token display
        const output = variableMaker(updatedScheme);
        displayColorTokens(output);
      });
    }

    rolesSection.appendChild(roleDiv);
  }

  return rolesSection;
}

function createSection(title) {
  const section = document.createElement("div");
  section.className = "control-section";

  const header = document.createElement("div");
  header.className = "control-section__header";
  header.innerHTML = `
    <h4 class="control-section__title">${title}</h4>
    <button class="section-toggle-btn">▼</button>
  `;

  const content = document.createElement("div");
  content.className = "control-section__content";

  const inner = document.createElement("div");
  inner.className = "color-group-control";
  content.appendChild(inner);

  const toggleBtn = header.querySelector(".section-toggle-btn");
  header.addEventListener("click", () => {
    content.classList.toggle("hidden");
    toggleBtn.style.transform = content.classList.contains("hidden") ? "rotate(-90deg)" : "rotate(0deg)";
  });

  section.appendChild(header);
  section.appendChild(content);

  // Hook appendChild to natively proxy children deep into the inner content shell safely
  const originalAppendChild = section.appendChild.bind(section);
  section.appendChild = function (node) {
    if (this.contains(content) && node !== header && node !== content) {
      return inner.appendChild(node);
    }
    return originalAppendChild(node);
  };

  return section;
}

function createInput(path, label, value, type = "text", options = []) {
  const div = document.createElement("div");
  div.className = "input-group";
  if (type === "select") {
    div.innerHTML = `
    <label class="input-group__label">${label}</label>
    <select class="input-group__control" data-path="${path}">
      ${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}
    </select>`;
    return div;
  }
  div.innerHTML = `
  <label class="input-group__label">${label}</label>
  <input type="${type}" class="input-group__control" value="${value}" data-path="${path}"/>
  `;
  return div;
}

// Set up global UI interactions
document.addEventListener("DOMContentLoaded", () => {
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const appContainer = document.querySelector("app");
  if (toggleSidebarBtn && appContainer) {
    toggleSidebarBtn.addEventListener("click", () => {
      appContainer.classList.toggle("sidebar-hidden");
    });
  }

  // Global Click-to-Copy mechanism
  document.addEventListener("click", async (e) => {
    const copyTarget = e.target.closest("[data-copy]");
    if (!copyTarget) return;

    const value = copyTarget.getAttribute("data-copy");
    try {
      await navigator.clipboard.writeText(value);

      // Temporary tooltip feedback
      const originalTooltip = copyTarget.getAttribute("data-tooltip");
      copyTarget.setAttribute("data-tooltip", "Copied!");
      copyTarget.classList.add("copy-success");

      setTimeout(() => {
        copyTarget.setAttribute("data-tooltip", originalTooltip);
        copyTarget.classList.remove("copy-success");
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });
});

function updateColorScheme(colorScheme, pathParts, value) {
  if (!colorScheme || !pathParts || pathParts.length === 0) return;

  // Handle nested properties
  let current = colorScheme;

  // Navigate to the parent object
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];

    // Handle array indices (like "0", "1", etc.)
    if (Array.isArray(current) && !isNaN(parseInt(key))) {
      current = current[parseInt(key)];
    }
    // Handle object properties
    else if (current && typeof current === "object") {
      // Create the property if it doesn't exist
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    } else {
      console.error(`Cannot navigate to ${key} in path ${pathParts.join(".")}`);
      return;
    }
  }

  // Set the value on the final property
  const lastKey = pathParts[pathParts.length - 1];

  // Handle array indices for the last key
  if (Array.isArray(current) && !isNaN(parseInt(lastKey))) {
    current[parseInt(lastKey)] = value;
  }
  // Handle object properties
  else if (current && typeof current === "object") {
    // Special handling for numeric values
    if (typeof value === "string" && !isNaN(parseFloat(value)) && isFinite(value)) {
      // Keep as string for some fields, convert for others
      if (lastKey === "minContrast" || lastKey === "spread" || lastKey === "colorSteps") {
        current[lastKey] = parseFloat(value);
      } else {
        current[lastKey] = value;
      }
    } else {
      current[lastKey] = value;
    }
  }

  // We let the caller handle the re-render to avoid redundant work
}

// CONFIG IMPORT/EXPORT FUNCTIONS
function exportColorScheme(colorScheme) {
  const dataStr = JSON.stringify(colorScheme, null, 2);
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `color-scheme-${colorScheme.name || "untitled"}-${new Date().toISOString().slice(0, 10)}.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function importColorScheme(event, onImportSuccess) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedScheme = JSON.parse(e.target.result);

      // Validate basic structure
      if (!importedScheme || !importedScheme.colors || !Array.isArray(importedScheme.colors) || !importedScheme.roles) {
        alert("Invalid color scheme file format");
        return;
      }

      onImportSuccess(importedScheme);

      // Clear the file input
      event.target.value = "";
    } catch (error) {
      console.error("Error parsing color scheme:", error);
      alert("Error parsing color scheme file. Please check the format.");
    }
  };

  reader.readAsText(file);
}

function createMainBtnGroup() {
  const basicSettingsSection = document.querySelector("#mainActionBtns");
  if (!basicSettingsSection) return;

  basicSettingsSection.className = "import-export-controls btn-Group";
  basicSettingsSection.innerHTML = `
        <button id="exportCss" class="btn btn--primary">Export CSS</button>
        <button id="downloadCsv" class="btn btn--primary">Export CSV</button>
        <button id="exportConfig" class="btn btn--primary">Export Config</button>
        <label for="importConfig" class="btn btn--primary">
          Import Config
          <input type="file" id="importConfig" accept=".json" style="display: none" />
        </label>
  `;

  // Set up event listeners
  const exportBtn = basicSettingsSection.querySelector("#exportConfig");
  const importInput = basicSettingsSection.querySelector("#importConfig");

  // Listeners are handled via event delegation in initializeColorControls

  if (importInput) {
    importInput.addEventListener("change", (e) => {
      importColorScheme(e, (importedScheme) => {
        // Update the global colorScheme with imported data
        Object.assign(demoConfig, importedScheme);

        // Update the current editable scheme
        window.currentEditableScheme = JSON.parse(JSON.stringify(demoConfig));

        // Reinitialize the UI with imported scheme
        initializeColorControls();
      });
    });
  }
}

// INITIALIZATION
function initializeColorControls() {
  // Always work on a deep copy so UI changes do not mutate the original
  const editable = JSON.parse(JSON.stringify(demoConfig));
  window.currentEditableScheme = editable; // Set global variable

  // Build all UI inputs + wire input handlers
  createColorInputs(editable, (updatedScheme) => {
    window.currentEditableScheme = updatedScheme;
    const output = variableMaker(updatedScheme);
    displayColorTokens(output);
  });

  // Add import/export controls
  setTimeout(() => {
    createMainBtnGroup();
  }, 50);

  // Render initial output
  const initialOutput = variableMaker(editable);
  displayColorTokens(initialOutput);

  // Event delegation for all buttons (Added once)
  if (!window.globalListenersSet) {
    document.addEventListener("click", (e) => {
      const targetId = e.target.id;

      if (targetId === "exportCss") {
        downloadCss(); // This function is in DocGen.js
      }

      if (targetId === "exportConfig") {
        exportColorScheme(window.currentEditableScheme || demoConfig);
      }

      if (targetId === "downloadCsv") {
        // Use current editable scheme for CSV export
        const currentScheme = window.currentEditableScheme || editable;
        const dataForCsv = variableMaker(currentScheme);

        console.log("Data being passed to flattenTokensForCsv:", dataForCsv);

        const flat = flattenTokensForCsv(dataForCsv);
        console.log("Flattened CSV data:", flat);

        if (flat.length === 0) {
          console.warn("No data found for CSV export");
          alert("No color token data found to export. Please check if the color system is properly configured.");
          return;
        }

        const columns = [
          { label: "Theme", path: "theme" },
          { label: "Group", path: "group" },
          { label: "Role", path: "role" },
          { label: "Variation", path: "variation" },
          { label: "Token Ref", path: "tokenRef" },
          { label: "Token Name", path: "tokenName" },
          { label: "Hex Value", path: "value" },
          { label: "Contrast Ratio", path: "contrastRatio" },
          { label: "Rating", path: "contrastRating" },
          { label: "Adjusted", path: "isAdjusted" },
        ];

        const csv = generateCSV({
          data: flat,
          columns: columns,
        });

        downloadCSV("tokens.csv", csv);
      }
    });
    window.globalListenersSet = true;
  }
}

// Export for module use if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    displayColorTokens,
    createColorInputs,
    initializeColorControls,
    exportColorScheme,
    importColorScheme,
  };
}
