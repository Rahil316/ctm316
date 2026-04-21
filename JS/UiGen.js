// UiGen.js - UI rendering and interaction layer.
// Builds the sidebar controls and main token display; delegates data work to ClrGen/DocGen.

// Active color scheme shared across all event handlers and re-renders.
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

  // Tab listener is registered once and survives panel re-renders (panels are replaced, nav bar is not).
  if (!window.tabListenersSet) {
    const tabsContainer = document.querySelector(".tabs-navigation");
    if (tabsContainer) {
      tabsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn) return;
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const targetId = btn.dataset.target;
        document.querySelectorAll(".tab-panel").forEach((p) => {
          p.classList.remove("active");
          p.classList.remove("animate-in");
        });
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.classList.add("active");
          void targetPanel.offsetWidth;
          targetPanel.classList.add("animate-in");
        }
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
        return `<div class="contextual-group"><h4 class="contextual-group__title">${colorGroup}</h4><p>No roles generated</p></div>`;
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
          const firstVar = Object.values(variations)[0];
          const displayRoleName = firstVar?.role || role;
          return variationsHTML ? `<div class="role-group"><h5 class="role-group-dark__title">${displayRoleName}</h5><div class="variations-grid">${variationsHTML}</div></div>` : "";
        })
        .join("");
      let className = theme === "dark" ? "contextual-group-dark" : "contextual-group";
      return rolesHTML ? `<div class="${className}"><h4 class="${className}__title">${colorGroup.toUpperCase()}</h4>${rolesHTML}</div>` : "";
    })
    .join("");
  const section = document.createElement("div");
  section.className = `theme-section ${theme}-theme`;
  section.innerHTML = `<h4 class="raw-colors-section__title">${themeName} Theme - Contextual Tokens</h4>${contextualHTML}`;
  return section;
}

// CONTROL PANEL FUNCTIONS
function createColorInputs(colorScheme, onUpdate) {
  const targetContainer = document.getElementById("colorInputs");
  if (!targetContainer) return;
  targetContainer.innerHTML = "";

  const basicSection = createSection("Basic Settings");
  basicSection.appendChild(createInput("name", "System Name", colorScheme.name));
  basicSection.appendChild(createInput("colorSteps", "Weight Count", colorScheme.colorSteps, "number"));
  basicSection.appendChild(createInput("rampType", "Ramp Generation Mode", colorScheme.rampType || "Balanced", "select", rampTypes));
  basicSection.appendChild(createInput("roleMapping", "Role Mapping Method", colorScheme.roleMapping || "Contrast Based", "select", roleMappingMethods));
  basicSection.appendChild(createColorInput("modes.0.bg", "Light Theme Background", colorScheme.modes[0].bg || "FFFFFF"));
  basicSection.appendChild(createColorInput("modes.1.bg", "Dark Theme Background", colorScheme.modes[1].bg || "000000"));
  targetContainer.appendChild(basicSection);
  targetContainer.appendChild(createColorGroupsSection(colorScheme));
  targetContainer.appendChild(createRolesSection(colorScheme, onUpdate));

  // Delegated listener registered once on the container; 350 ms debounce batches rapid input.
  if (!targetContainer.dataset.hasListener) {
    let updateTimeout;
    ["input", "change"].forEach((evtType) => {
      targetContainer.addEventListener(evtType, (e) => {
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
        if (typeof onUpdate === "function") onUpdate(activeScheme);
      }, 350);
      });
    });
    targetContainer.dataset.hasListener = "true";
  }

  // Role mapping needs its own direct listener (not the delegated one) because switching modes
  // rebuilds the entire sidebar HTML, which must happen before onUpdate re-renders tokens.
  const roleMappingSelect = targetContainer.querySelector('[data-path="roleMapping"]');
  if (roleMappingSelect) {
    roleMappingSelect.removeEventListener("change", roleMappingSelect._handler);
    const handler = (e) => {
      const activeScheme = window.currentEditableScheme;
      if (activeScheme) {
        activeScheme.roleMapping = e.target.value;
        createColorInputs(activeScheme, onUpdate);
        if (typeof onUpdate === "function") onUpdate(activeScheme);
      }
    };
    roleMappingSelect.addEventListener("change", handler);
    roleMappingSelect._handler = handler;
  }
}

function createColorGroupsSection(colorScheme) {
  const colorsSection = createSection("Color Groups");
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
    createColorInputs(colorScheme, (updated) => {
      window.currentEditableScheme = updated;
      const output = variableMaker(updated);
      displayColorTokens(output);
    });
  });
  colorsSection.appendChild(addButton);
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
  const deleteBtn = div.querySelector(".delete-group-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.dataset.index);
      colorScheme.colors.splice(idx, 1);
      const updatedScheme = JSON.parse(JSON.stringify(colorScheme));
      window.currentEditableScheme = updatedScheme;
      createColorInputs(updatedScheme, (newUpdatedScheme) => {
        window.currentEditableScheme = newUpdatedScheme;
        const output = variableMaker(newUpdatedScheme);
        displayColorTokens(output);
      });
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

function createRolesSection(colorScheme, onUpdate) {
  const rolesSection = createSection("Roles Configuration");
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
      baseIndex: Math.floor(colorScheme.colorSteps / 2),
    };
    createColorInputs(colorScheme, (updated) => {
      window.currentEditableScheme = updated;
      const output = variableMaker(updated);
      displayColorTokens(output);
    });
  });
  rolesSection.appendChild(addButton);

  const isManualMode = colorScheme.roleMapping === "Manual Base Index";
  const rampLength = colorScheme.colorSteps;

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

    // Spread input (common)
    const spreadInput = createInput(`roles.${roleKey}.spread`, "Spread", role.spread, "number");
    roleInputs.appendChild(spreadInput);
    const shortNameInput = createInput(`roles.${roleKey}.shortName`, "Short Name", role.shortName);
    roleInputs.appendChild(shortNameInput);

    if (isManualMode) {
      // Manual mode: Base Step (1‑based) – managed manually without data-path
      const zeroBased = role.baseIndex !== undefined ? role.baseIndex : Math.floor(rampLength / 2);
      const stepValue = zeroBased + 1;
      const baseStepDiv = document.createElement("div");
      baseStepDiv.className = "input-group";
      baseStepDiv.innerHTML = `
        <label class="input-group__label">Base Step (1-${rampLength})</label>
        <input type="number" class="input-group__control" value="${stepValue}" min="1" max="${rampLength}">
      `;
      const stepInput = baseStepDiv.querySelector("input");
      stepInput.addEventListener("change", (e) => {
        let newStep = parseInt(e.target.value);
        if (isNaN(newStep)) newStep = 1;
        newStep = Math.min(rampLength, Math.max(1, newStep));
        const newZeroBased = newStep - 1;
        // Update the config
        role.baseIndex = newZeroBased;
        // Update the input's displayed value
        e.target.value = newStep;
        // Trigger re-render of tokens
        if (typeof onUpdate === "function") onUpdate(colorScheme);
      });
      roleInputs.appendChild(baseStepDiv);
    } else {
      // Contrast mode: Min Contrast
      const minContrastInput = createInput(`roles.${roleKey}.minContrast`, "Min Contrast", role.minContrast, "number");
      roleInputs.appendChild(minContrastInput);
    }

    roleDiv.appendChild(roleInputs);
    const deleteBtn = roleDiv.querySelector(".delete-group-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const rKey = e.target.dataset.role;
        delete colorScheme.roles[rKey];
        const updatedScheme = JSON.parse(JSON.stringify(colorScheme));
        window.currentEditableScheme = updatedScheme;
        createColorInputs(updatedScheme, (newUpdatedScheme) => {
          window.currentEditableScheme = newUpdatedScheme;
          const output = variableMaker(newUpdatedScheme);
          displayColorTokens(output);
        });
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
  header.innerHTML = `<h4 class="control-section__title">${title}</h4><button class="section-toggle-btn">▼</button>`;
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
  // Override appendChild so callers can treat the section like a flat container —
  // child nodes are automatically routed into the collapsible inner div.
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
    div.innerHTML = `<label class="input-group__label">${label}</label><select class="input-group__control" data-path="${path}">${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select>`;
    return div;
  }
  div.innerHTML = `<label class="input-group__label">${label}</label><input type="${type}" class="input-group__control" value="${value}" data-path="${path}"/>`;
  return div;
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const appContainer = document.querySelector("app");
  if (toggleSidebarBtn && appContainer) {
    toggleSidebarBtn.addEventListener("click", () => {
      appContainer.classList.toggle("sidebar-hidden");
    });
  }
  document.addEventListener("click", async (e) => {
    const copyTarget = e.target.closest("[data-copy]");
    if (!copyTarget) return;
    const value = copyTarget.getAttribute("data-copy");
    try {
      await navigator.clipboard.writeText(value);
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
  let current = colorScheme;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (Array.isArray(current) && !isNaN(parseInt(key))) {
      current = current[parseInt(key)];
    } else if (current && typeof current === "object") {
      if (!(key in current)) current[key] = {};
      current = current[key];
    } else {
      console.error(`Cannot navigate to ${key} in path ${pathParts.join(".")}`);
      return;
    }
  }
  const lastKey = pathParts[pathParts.length - 1];
  if (Array.isArray(current) && !isNaN(parseInt(lastKey))) {
    current[parseInt(lastKey)] = value;
  } else if (current && typeof current === "object") {
    if (typeof value === "string" && !isNaN(parseFloat(value)) && isFinite(value)) {
      if (lastKey === "minContrast" || lastKey === "spread" || lastKey === "colorSteps") {
        current[lastKey] = parseFloat(value);
      } else {
        current[lastKey] = value;
      }
    } else {
      current[lastKey] = value;
    }
  }
}

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
      if (!importedScheme || !importedScheme.colors || !Array.isArray(importedScheme.colors) || !importedScheme.roles) {
        alert("Invalid color scheme file format");
        return;
      }
      onImportSuccess(importedScheme);
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
  const importInput = basicSettingsSection.querySelector("#importConfig");
  if (importInput) {
    importInput.addEventListener("change", (e) => {
      importColorScheme(e, (importedScheme) => {
        Object.assign(demoConfig, importedScheme);
        window.currentEditableScheme = JSON.parse(JSON.stringify(demoConfig));
        initializeColorControls();
      });
    });
  }
}

function initializeColorControls() {
  const editable = JSON.parse(JSON.stringify(demoConfig));
  window.currentEditableScheme = editable;
  createColorInputs(editable, (updatedScheme) => {
    window.currentEditableScheme = updatedScheme;
    const output = variableMaker(updatedScheme);
    displayColorTokens(output);
  });
  setTimeout(() => {
    createMainBtnGroup();
  }, 50);
  const initialOutput = variableMaker(editable);
  displayColorTokens(initialOutput);
  if (!window.globalListenersSet) {
    document.addEventListener("click", (e) => {
      const targetId = e.target.id;
      if (targetId === "exportCss") {
        downloadCss();
      }
      if (targetId === "exportConfig") {
        exportColorScheme(window.currentEditableScheme || demoConfig);
      }
      if (targetId === "downloadCsv") {
        const currentScheme = window.currentEditableScheme || editable;
        const dataForCsv = variableMaker(currentScheme);
        const flat = flattenTokensForCsv(dataForCsv);
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
        const csv = generateCSV({ data: flat, columns: columns });
        downloadCSV("tokens.csv", csv);
      }
    });
    window.globalListenersSet = true;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    displayColorTokens,
    createColorInputs,
    initializeColorControls,
    exportColorScheme,
    importColorScheme,
  };
}
