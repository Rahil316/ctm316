// COLOR SYSTEM
const colorScheme = {
  name: "R316 Color Token System",
  clrGroups: [
    { name: "primary", shortName: "Pr", value: "5d10d1" },
    { name: "secondary", shortName: "Sc", value: "904AAA" },
    { name: "tertiary", shortName: "Te", value: "7E8088" },
    { name: "black", shortName: "Bk", value: "1C2230" },
    { name: "gray", shortName: "Gr", value: "87899D" },
    { name: "success", shortName: "Su", value: "47B872" },
    { name: "danger", shortName: "Dg", value: "ED3E3E" },
    { name: "warning", shortName: "Wg", value: "F2AA30" },
    { name: "info", shortName: "In", value: "206BB0" },
  ],
  roles: {
    text: { name: "Text", shortName: "tx", minContrast: "5", gaps: 3 },
    layer: { name: "Layer", shortName: "ly", minContrast: "0", gaps: 1 },
    stroke: { name: "Stroke", shortName: "st", minContrast: "1", gaps: 1 },
    fill: { name: "Fill", shortName: "fi", minContrast: "4", gaps: 2 },
  },
  variations: {
    weakest: { name: "Weakest", code: "1" },
    weak: { name: "Weak", code: "2" },
    base: { name: "Base", code: "3" },
    strong: { name: "Strong", code: "4" },
    stronger: { name: "Stronger", code: "5" },
  },
  weightCount: 23,
  lightBg: "FFFFFF",
  darkBg: "000000",
  weightNames: "",
};

// CACHE FOR FREQUENT CALLS
// ============================================================================
// Since variableMaker() is called frequently (up to 5x/sec), we should cache results
const colorCache = new Map();
let lastInputHash = null;
let cachedOutput = null;

// COLOR SYSTEM GENERATOR
// ============================================================================
function variableMaker(clrSys) {
  // Return cached result if the inputs haven't changed to avoid recalculating
  const inputHash = JSON.stringify({
    clrGroups: clrSys.clrGroups.map((g) => ({
      ...g,
      value: normalizeHex(g.value),
    })),
    weightCount: clrSys.weightCount,
    lightBg: normalizeHex(clrSys.lightBg),
    darkBg: normalizeHex(clrSys.darkBg),
    roles: clrSys.roles,
  });

  if (inputHash === lastInputHash && cachedOutput) {
    return cachedOutput;
  }

  const clrGroups = clrSys.clrGroups;
  const clrRoles = clrSys.roles;
  const clrWeights = seriesMaker(clrSys.weightCount);

  // Pre-calculate normalized backgrounds
  const lightBg = normalizeHex(clrSys.lightBg) || "#FFFFFF";
  const darkBg = normalizeHex(clrSys.darkBg) || "#000000";

  // Pre-allocate objects with known structures
  const rawVarObj = Object.create(null);
  const conVarObj = {
    light: Object.create(null),
    dark: Object.create(null),
  };

  const weightCount = clrWeights.length;

  // Pre-calculate weight indices over all weights
  const weightIndices = new Array(weightCount);
  for (let i = 0; i < weightCount; i++) weightIndices[i] = i;

  const errors = { critical: [], warnings: [], notices: [] };

  // RAW COLORS GENERATION
  // ============================================================================
  for (let gIdx = 0; gIdx < clrGroups.length; gIdx++) {
    const group = clrGroups[gIdx];
    const groupName = group.name;
    const seed = normalizeHex(group.value) || "#000000";

    // Batch generate colors to cover all defined weights
    const colorVars = colorCalSplit(seed, clrWeights);
    colorVars.reverse(); // Values map from lightest to darkest weights

    const rawGroupObj = Object.create(null);
    rawVarObj[groupName] = rawGroupObj;

    // Evaluate contrasts against both light and dark modes
    for (let wIdx = 0; wIdx < weightCount; wIdx++) {
      const weight = clrWeights[wIdx];
      const value = normalizeHex(colorVars[wIdx]) || seed;

      // Extract ratio values efficiently without redundancy
      const lightContrast = contrastRatio(value, lightBg);
      const darkContrast = contrastRatio(value, darkBg);

      rawGroupObj[weight] = {
        value,
        tknName: `${groupName}-${weight}`,
        shortName: `${group.shortName}-${weight}`,
        contrast: {
          light: {
            ratio: lightContrast,
            rating: contrastRating(value, lightBg),
          },
          dark: {
            ratio: darkContrast,
            rating: contrastRating(value, darkBg),
          },
        },
      };
    }
  }

  // Check if a base index can satisfy all expected scale variations
  // ============================================================================
  function canUseBaseIndex(groupName, baseIdx, role, themeName) {
    const gap = role.gaps;
    const maxOffset = 2 * gap; // Needs space for weakest (-2*gap) and stronger (+2*gap)

    // A set can be made reasonably if there is enough space on both ends
    // to step out the variations without crossing index 0 or weightCount - 1.
    return baseIdx - maxOffset >= 0 && baseIdx + maxOffset < weightCount;
  }

  // CONTEXTUAL TOKENS GENERATION
  // ============================================================================
  const themes = [
    { name: "light", bg: lightBg },
    { name: "dark", bg: darkBg },
  ];

  // Process themes to output contextual matching variations
  for (let tIdx = 0; tIdx < themes.length; tIdx++) {
    const theme = themes[tIdx];
    const t = theme.name;
    const conTheme = conVarObj[t];

    for (let gIdx = 0; gIdx < clrGroups.length; gIdx++) {
      const group = clrGroups[gIdx];
      const groupName = group.name;
      const conGroup = Object.create(null);
      conTheme[groupName] = conGroup;

      // Get role names once
      const roleNames = Object.keys(clrRoles);

      for (let rIdx = 0; rIdx < roleNames.length; rIdx++) {
        const roleName = roleNames[rIdx];
        const role = clrRoles[roleName];
        const gap = role.gaps;
        const minC = parseFloat(role.minContrast);

        const conRole = Object.create(null);
        conGroup[roleName] = conRole;

        // Find Usable Base Index
        // ============================================================================
        let baseIdx = -1;

        // Use conditional traversal for optimal base index
        // Themes need different search directions to find the MINIMAL passing color:
        // - Light bg: Start at lightest (0)  -> getting darker until c >= minC
        // - Dark bg: Start at darkest (22) -> getting lighter until c >= minC
        const isDarkTheme = t === "dark";

        if (isDarkTheme) {
          for (let i = weightCount - 1; i >= 0; i--) {
            const weight = clrWeights[i];
            const c = rawVarObj[groupName][weight].contrast[t].ratio;

            if (c >= minC && canUseBaseIndex(groupName, i, role, t)) {
              baseIdx = i;
              break;
            }
          }
        } else {
          for (let i = 0; i < weightCount; i++) {
            const weight = clrWeights[i];
            const c = rawVarObj[groupName][weight].contrast[t].ratio;

            if (c >= minC && canUseBaseIndex(groupName, i, role, t)) {
              baseIdx = i;
              break;
            }
          }
        }

        // FALLBACK: Find best available index
        if (baseIdx === -1) {
          let bestIdx = -1;
          let bestRange = -1;

          for (let i = 0; i < weightCount; i++) {
            const weight = clrWeights[i];
            const c = rawVarObj[groupName][weight].contrast[t].ratio;

            if (c >= minC) {
              // Calculate range centeredness
              const range = i < weightCount - 1 - i ? i : weightCount - 1 - i;

              if (range > bestRange) {
                bestIdx = i;
                bestRange = range;
              }
            }
          }

          if (bestIdx !== -1) {
            baseIdx = bestIdx;
            errors.warnings.push({
              color: groupName,
              role: roleName,
              theme: t,
              warning: "Min contrast met only partially; using best fallback.",
            });
          } else {
            // Fallback to absolute mathematical midpoint of variants array
            baseIdx = weightCount >> 1; // Integer division by 2
            errors.critical.push({
              color: groupName,
              role: roleName,
              theme: t,
              error: "Cannot meet minimum contrast for any weight.",
            });
          }
        }

        // Clamp base index to boundaries to prevent array overflow
        // ============================================================================
        const maxOffset = 2 * gap;
        // Determine safe min and max boundaries
        const minAllowed = maxOffset;
        const maxAllowed = weightCount - 1 - maxOffset;

        if (baseIdx < minAllowed) baseIdx = minAllowed;
        if (baseIdx > maxAllowed) baseIdx = maxAllowed;

        // Generate Contextual Variations
        // ============================================================================
        // Define standard token position offsets
        const offsetValues = [
          { key: "weakest", offset: -2 * gap },
          { key: "weak", offset: -gap },
          { key: "base", offset: 0 },
          { key: "strong", offset: gap },
          { key: "stronger", offset: 2 * gap },
        ];

        for (let vIdx = 0; vIdx < offsetValues.length; vIdx++) {
          const { key: variation, offset } = offsetValues[vIdx];
          let idx = baseIdx + offset;
          let adjusted = false;

          // Clamp to valid range
          if (idx < 0) {
            idx = 0;
            adjusted = true;
          } else if (idx >= weightCount) {
            idx = weightCount - 1;
            adjusted = true;
          }

          const weight = clrWeights[idx];
          const data = rawVarObj[groupName][weight];

          conRole[variation] = {
            value: data.value,
            contrastRatio: data.contrast[t].ratio,
            contrastRating: data.contrast[t].rating,
            valueRef: data.tknName,
            tknRole: roleName,
            roleName: role.name, // Display name
            tknClGroup: groupName,
            weight,
            variationOffset: offset,
            isAdjusted: adjusted,
          };

          if (adjusted) {
            errors.warnings.push({
              color: groupName,
              role: roleName,
              variation,
              theme: t,
              warning: `Variation '${variation}' clamped due to overflow`,
            });
          }
        }
      }
    }
  }

  const output = {
    raw: rawVarObj,
    ctx: conVarObj,
    errors,
    backgrounds: {
      light: normalizeHex(lightBg),
      dark: normalizeHex(darkBg),
    },
    metadata: {
      groups: clrGroups.length,
      weights: weightCount,
      roles: Object.keys(clrRoles).length,
      themes: 2,
    },
  };

  // Cache the result
  lastInputHash = inputHash;
  cachedOutput = output;
  // For debugging: Log primary fill base colors
  console.table(output.raw.primary);

  return output;
}

// ADDITIONAL OPTIMIZATIONS
// ============================================================================

// 1. LAZY EVALUATION: Only generate what's needed
function getContextualToken(clrSys, theme, groupName, roleName, variation) {
  // Could implement a more targeted generation if only specific tokens are needed
}

// 2. INCREMENTAL UPDATES: Update only changed parts
function updateColorSchemeProperty(clrSys, propertyPath, newValue) {
  // Clear cache if relevant property changed
  if (
    propertyPath.startsWith("clrGroups") ||
    propertyPath === "weightCount" ||
    propertyPath === "lightBg" ||
    propertyPath === "darkBg"
  ) {
    lastInputHash = null;
  }
  // Update scheme...
}

// 3. WORKER SUPPORT: For very heavy computations
if (typeof window !== "undefined" && window.Worker) {
  const colorWorker = new Worker("color-worker.js");
  // Could offload heavy computations to web worker
}

// 4. VALIDATION LAYER: Add schema validation
const colorSchemeSchema = {
  // Define expected structure for validation
};

function validateColorScheme(scheme) {
  // Validate before processing
  return true; // or validation result
}

// 5. BATCH PROCESSING: For multiple operations
function batchVariableMaker(schemes) {
  // Process multiple schemes at once if needed
}
