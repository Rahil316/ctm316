// COLOR SYSTEM
const demoConfig = {
  name: "CTM316",
  colors: [
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
    text: { name: "Text", shortName: "tx", minContrast: "5", spread: 3 },
    layer: { name: "Layer", shortName: "ly", minContrast: "0", spread: 1 },
    stroke: { name: "Stroke", shortName: "st", minContrast: "1", spread: 1 },
    fill: { name: "Fill", shortName: "fi", minContrast: "4", spread: 2 },
  },
  roleSteps: 5,
  roleStepNames: ["Weakest", "Weak", "Base", "Strong", "Stronger"],
  colorSteps: 23,
  rampType: "Symmetric",
  roleMapping: "Contrast Based",
  colorStepNames: null || seriesMaker(23),
  modes: [
    {
      name: "light",
      bg: "FFFFFF",
    },
    {
      name: "dark",
      bg: "000000",
    },
  ],
};
const roleMappingMethods = ["Contrast Based", "Manual Base Index"];
const rampTypes = ["Linear", "Balanced", "Symmetric"];
// CACHE FOR FREQUENT CALLS
// ============================================================================
const colorCache = new Map();
let lastInputHash = null;
let cachedOutput = null;

// COLOR SYSTEM GENERATOR
// ============================================================================
function variableMaker(config) {
  // base Definitions
  const colors = config.colors;
  const roles = config.roles;
  const rampLength = config.colorSteps;
  let stepNames = config.colorStepNames || seriesMaker(config.colorSteps);
  let roleStepNames = config.roleStepNames || seriesMaker(config.roleStepNames);

  // Return cached result if the inputs haven't changed to avoid recalculating
  const inputHash = JSON.stringify({
    colors: config.colors.map((g) => ({
      ...g,
      value: normalizeHex(g.value),
    })),
    rampLength: config.colorSteps,
    lightBg: normalizeHex(config.modes[0].bg),
    darkBg: normalizeHex(config.modes[1].bg),
    roles: config.roles,
  });

  if (inputHash === lastInputHash && cachedOutput) {
    return cachedOutput;
  }

  // Pre-calculate normalized backgrounds
  const lightBg = normalizeHex(config.modes[0].bg);
  const darkBg = normalizeHex(config.modes[1].bg);

  // Pre-allocate objects with known structures
  const clrRampsCollection = Object.create(null);
  const tokensCollection = {
    light: Object.create(null),
    dark: Object.create(null),
  };

  const errors = { critical: [], warnings: [], notices: [] };

  // Color Ramps Creation
  // ========================================================================================================================================================
  for (const color of colors) {
    const colorRamp = colorRampMaker(color.value, rampLength, config.rampType);
    const ramp = Object.create(null);
    clrRampsCollection[color.name] = ramp;

    // Evaluate contrasts against both light and dark modes
    for (let wIdx = 0; wIdx < rampLength; wIdx++) {
      const weight = stepNames[wIdx];
      const value = normalizeHex(colorRamp[wIdx]);

      // Extract ratio values efficiently without redundancy
      const lightContrast = contrastRatio(value, lightBg);
      const darkContrast = contrastRatio(value, darkBg);

      ramp[weight] = {
        value,
        stepName: `${color.name}-${weight}`,
        shortName: `${color.shortName}-${weight}`,
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

  // Role Tokens Creation
  // ========================================================================================================================================================

  // Process themes to output contextual matching variations
  for (const mode of config.modes) {
    const modeName = mode.name; // Get the string name once
    const conTheme = tokensCollection[modeName];
    const bgColor = modeName === "light" ? lightBg : darkBg;

    // Loops for Colors
    for (const color of colors) {
      const clrName = color.name;
      const conGroup = Object.create(null);
      conTheme[clrName] = conGroup;
      const roleNames = Object.keys(roles);
      if (config.roleMapping === "Contrast Based") {
        // Loop for Roles
        for (const roleName of roleNames) {
          const role = roles[roleName];
          const spread = role.spread;
          const minC = parseFloat(role.minContrast);
          const conRole = Object.create(null);
          conGroup[roleName] = conRole;

          // Find Usable Base Index
          let baseIdx = -1;

          // Use contextual contrast to determine direction of "stronger" (higher contrast)
          const highestWeight = stepNames[rampLength - 1];
          const lowestWeight = stepNames[0];
          const cEnd = clrRampsCollection[clrName][highestWeight].contrast[modeName].ratio;
          const cStart = clrRampsCollection[clrName][lowestWeight].contrast[modeName].ratio;

          // If the darkest color (end) has more contrast, positive index adds contrast.
          // If the lightest color (start) has more contrast, positive index removes contrast.
          const contrastGrowthDir = cEnd > cStart ? 1 : -1;

          const isDarkTheme = modeName === "dark";

          if (isDarkTheme) {
            for (let i = rampLength - 1; i >= 0; i--) {
              const weight = stepNames[i];
              const c = clrRampsCollection[clrName][weight].contrast[modeName].ratio;

              if (c >= minC) {
                baseIdx = i;
                break;
              }
            }
          } else {
            for (let i = 0; i < rampLength; i++) {
              const weight = stepNames[i];
              const c = clrRampsCollection[clrName][weight].contrast[modeName].ratio;

              if (c >= minC) {
                baseIdx = i;
                break;
              }
            }
          }

          // FALLBACK: If bounds constraints or general availability prevented a match
          if (baseIdx === -1) {
            let bestIdx = -1;
            let maxContrast = -1;

            // Find the color that has MAXIMUM possible contrast
            for (let i = 0; i < rampLength; i++) {
              const weight = stepNames[i];
              const c = clrRampsCollection[clrName][weight].contrast[modeName].ratio;

              if (c > maxContrast) {
                bestIdx = i;
                maxContrast = c;
              }
            }

            if (bestIdx !== -1) {
              baseIdx = bestIdx;
              errors.critical.push({
                color: clrName,
                role: roleName,
                theme: modeName,
                error: `Cannot meet minimum contrast ${minC}. using closest available (${maxContrast.toFixed(2)}).`,
              });
            } else {
              baseIdx = rampLength >> 1; // Integer division by 2
              errors.critical.push({
                color: clrName,
                role: roleName,
                theme: modeName,
                error: "Cannot evaluate contrast for any weight.",
              });
            }
          }

          // Clamp base index to boundaries to prevent array overflow
          // ============================================================================
          const maxOffset = 2 * spread;
          // Determine safe min and max boundaries
          const minAllowed = maxOffset;
          const maxAllowed = rampLength - 1 - maxOffset;

          if (baseIdx < minAllowed) baseIdx = minAllowed;
          if (baseIdx > maxAllowed) baseIdx = maxAllowed;

          // Generate Contextual Variations
          // ============================================================================
          // Define standard token position offsets
          const offsetValues = [
            { key: "weakest", offset: -2 * spread },
            { key: "weak", offset: -spread },
            { key: "base", offset: 0 },
            { key: "strong", offset: spread },
            { key: "stronger", offset: 2 * spread },
          ];

          for (let vIdx = 0; vIdx < offsetValues.length; vIdx++) {
            const { key: variation, offset: pureOffset } = offsetValues[vIdx];

            // Ensure stronger ALWAYS means higher contrast relative to background!
            let idx = baseIdx + pureOffset * contrastGrowthDir;
            let adjusted = false;

            // Clamp to valid range
            if (idx < 0) {
              idx = 0;
              adjusted = true;
            } else if (idx >= rampLength) {
              idx = rampLength - 1;
              adjusted = true;
            }

            const weight = stepNames[idx];
            const data = clrRampsCollection[clrName][weight];

            conRole[variation] = {
              // Token Identity
              tknName: `${clrName}-${role.name}-${variation}`,
              color: clrName,
              role: role.name,
              variation: variation,
              // Token Value
              tknRef: data.stepName, // Fixed: was data.clrName which doesn't exist
              value: data.value,
              // Contrast
              contrast: {
                ratio: data.contrast[modeName].ratio,
                rating: data.contrast[modeName].rating,
              },
              // Mapping Adjustments
              variationOffset: pureOffset,
              isAdjusted: adjusted,
            };
            // Push Warning
            if (adjusted) {
              errors.warnings.push({
                color: clrName,
                role: roleName,
                variation,
                theme: modeName,
                warning: `Variation '${variation}' clamped due to overflow`,
              });
            }
          }
        }
      } else if (config.roleMapping === "Manual Base Index") {
        //Instructions: instead of min contrast we will have the specific Color Ramp Step to use as the base step of role token and using spread we will calculate all the steps for the role tokens.
      }

      // Preparing Output
      const output = {
        colorRamps: clrRampsCollection,
        colorTokens: tokensCollection,
        errors,
      };

      // Cache the result
      lastInputHash = inputHash;
      cachedOutput = output;

      return output;
    }
  }
}
