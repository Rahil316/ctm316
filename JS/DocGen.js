// Generate CSS file
function flattenToCss(collection) {
  // collection has: { colorRamps, colorTokens, errors }
  const cssVars = { 
    raw: {},      // Raw color ramp variables (shared)
    light: {},    // Light theme tokens (reference raw vars)
    dark: {}      // Dark theme tokens (reference raw vars)
  };

  if (!collection.colorRamps) {
    console.error("No colorRamps found in collection");
    return cssVars;
  }

  // 1. Raw colors (color ramps) - defined once, used by both themes
  Object.entries(collection.colorRamps).forEach(([group, weights]) => {
    Object.entries(weights).forEach(([weight, data]) => {
      if (!data?.value) return;
      const varName = `--${slugify(group)}-${slugify(weight)}`;
      const value = data.value || "#000000";
      cssVars.raw[varName] = value;
    });
  });

  // 2. Contextual tokens for each theme - reference raw color variables
  if (collection.colorTokens) {
    Object.entries(collection.colorTokens).forEach(([theme, themeData]) => {
      if (!themeData) return;
      
      Object.entries(themeData).forEach(([group, roles]) => {
        if (!roles) return;
        
        Object.entries(roles).forEach(([role, variations]) => {
          if (!variations) return;
          
          Object.entries(variations).forEach(([variation, data]) => {
            if (!data?.tknRef) return;
            
            // Create token name
            const tokenName = `--${slugify(group)}-${slugify(data.role || role)}-${slugify(variation)}`;
            
            // Reference the raw color variable
            const ref = data.tknRef;
            const lastDash = ref.lastIndexOf("-");
            if (lastDash === -1) return;
            
            const refGroup = slugify(ref.substring(0, lastDash));
            const refWeight = slugify(ref.substring(lastDash + 1));
            const rawVarRef = `var(--${refGroup}-${refWeight})`;
            
            cssVars[theme][tokenName] = rawVarRef;
          });
        });
      });
    });
  }

  return cssVars;
}

function generateCss(cssVars) {
  let css = `/* Color Tokens - Auto-generated */\n`;
  css += `/* Generated on: ${new Date().toISOString()} */\n\n`;
  
  // 1. Raw Color Ramps (base colors)
  css += `/* ============================================\n`;
  css += `   RAW COLOR RAMPS\n`;
  css += `   These are the base color values\n`;
  css += `   ============================================ */\n\n`;
  
  css += `:root {\n`;
  Object.entries(cssVars.raw).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n\n`;
  
  // 2. Light Theme Tokens (reference raw variables)
  css += `/* ============================================\n`;
  css += `   LIGHT THEME TOKENS\n`;
  css += `   References to raw color ramps\n`;
  css += `   ============================================ */\n\n`;
  
  css += `:root,\n`;
  css += `.light,\n`;
  css += `[data-theme="light"] {\n`;
  Object.entries(cssVars.light).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n\n`;

  // 3. Dark Theme Tokens (reference raw variables)
  css += `/* ============================================\n`;
  css += `   DARK THEME TOKENS\n`;
  css += `   References to raw color ramps\n`;
  css += `   ============================================ */\n\n`;
  
  css += `@media (prefers-color-scheme: dark) {\n`;
  css += `  :root {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `    ${variable}: ${value};\n`;
  });
  css += `  }\n`;
  css += `}\n\n`;
  
  css += `.dark,\n`;
  css += `[data-theme="dark"] {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n`;

  return css;
}

// Alternative: Generate separate CSS files for each theme
function generateSeparateCssFiles(cssVars) {
  const files = {
    raw: `/* Raw Color Ramps - Base Colors */\n:root {\n${Object.entries(cssVars.raw).map(([varName, value]) => `  ${varName}: ${value};`).join("\n")}\n}`,
    light: `/* Light Theme Tokens */\n.light,\n[data-theme="light"] {\n${Object.entries(cssVars.light).map(([varName, value]) => `  ${varName}: ${value};`).join("\n")}\n}`,
    dark: `/* Dark Theme Tokens */\n.dark,\n[data-theme="dark"] {\n${Object.entries(cssVars.dark).map(([varName, value]) => `  ${varName}: ${value};`).join("\n")}\n}`
  };
  return files;
}

// Download CSS file
function downloadCss() {
  try {
    // Get the current scheme
    const currentScheme = window.currentEditableScheme || demoConfig;
    console.log("Generating CSS for scheme:", currentScheme.name);

    // Get the collection from the generator
    const collection = variableMaker(currentScheme);

    if (!collection || !collection.colorRamps) {
      throw new Error("Invalid collection generated from variableMaker");
    }

    // Flatten to CSS variables
    const cssVars = flattenToCss(collection);
    
    // Generate CSS content
    const cssContent = generateCss(cssVars);
    
    // Create and trigger download
    const blob = new Blob([cssContent], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(currentScheme.name)}-tokens.css`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log("CSS downloaded successfully");
    console.log(`Raw colors: ${Object.keys(cssVars.raw).length}`);
    console.log(`Light tokens: ${Object.keys(cssVars.light).length}`);
    console.log(`Dark tokens: ${Object.keys(cssVars.dark).length}`);
  } catch (error) {
    console.error("Error generating CSS:", error);
    alert(`Error generating CSS: ${error.message}`);
  }
}

// Generate SCSS format with proper variable references
function generateScss(collection) {
  if (!collection || !collection.colorRamps) return "";
  
  let scss = `// Color Tokens - Auto-generated SCSS\n`;
  scss += `// Generated on: ${new Date().toISOString()}\n\n`;
  
  // 1. Raw color ramp variables
  scss += `// ============================================\n`;
  scss += `// RAW COLOR RAMPS\n`;
  scss += `// ============================================\n\n`;
  
  Object.entries(collection.colorRamps).forEach(([group, weights]) => {
    scss += `// ${group.toUpperCase()} Ramps\n`;
    Object.entries(weights).forEach(([weight, data]) => {
      if (!data?.value) return;
      const varName = `$${slugify(group)}-${slugify(weight)}`;
      scss += `${varName}: ${data.value};\n`;
    });
    scss += `\n`;
  });
  
  // 2. Light theme tokens (referencing raw variables)
  scss += `// ============================================\n`;
  scss += `// LIGHT THEME TOKENS\n`;
  scss += `// ============================================\n\n`;
  
  scss += `$light-theme: (\n`;
  if (collection.colorTokens?.light) {
    Object.entries(collection.colorTokens.light).forEach(([group, roles]) => {
      Object.entries(roles).forEach(([role, variations]) => {
        Object.entries(variations).forEach(([variation, data]) => {
          if (!data?.tknRef) return;
          const varName = `${slugify(group)}-${slugify(data.role || role)}-${slugify(variation)}`;
          const ref = data.tknRef;
          const lastDash = ref.lastIndexOf("-");
          const refGroup = slugify(ref.substring(0, lastDash));
          const refWeight = slugify(ref.substring(lastDash + 1));
          scss += `  $${varName}: $${refGroup}-${refWeight},\n`;
        });
      });
    });
  }
  scss += `);\n\n`;
  
  // 3. Dark theme tokens (referencing raw variables)
  scss += `// ============================================\n`;
  scss += `// DARK THEME TOKENS\n`;
  scss += `// ============================================\n\n`;
  
  scss += `$dark-theme: (\n`;
  if (collection.colorTokens?.dark) {
    Object.entries(collection.colorTokens.dark).forEach(([group, roles]) => {
      Object.entries(roles).forEach(([role, variations]) => {
        Object.entries(variations).forEach(([variation, data]) => {
          if (!data?.tknRef) return;
          const varName = `${slugify(group)}-${slugify(data.role || role)}-${slugify(variation)}`;
          const ref = data.tknRef;
          const lastDash = ref.lastIndexOf("-");
          const refGroup = slugify(ref.substring(0, lastDash));
          const refWeight = slugify(ref.substring(lastDash + 1));
          scss += `  $${varName}: $${refGroup}-${refWeight},\n`;
        });
      });
    });
  }
  scss += `);\n`;
  
  return scss;
}

// Generate simplified CSS (just the tokens, no media queries)
function generateSimpleCss(cssVars) {
  let css = `/* Color Tokens - Simplified */\n\n`;
  
  css += `/* Raw Color Ramps */\n`;
  css += `:root {\n`;
  Object.entries(cssVars.raw).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n\n`;
  
  css += `/* Light Theme */\n`;
  css += `.light-theme {\n`;
  Object.entries(cssVars.light).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n\n`;
  
  css += `/* Dark Theme */\n`;
  css += `.dark-theme {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n`;
  
  return css;
}

// Generate CSV file (same as before, kept for compatibility)
function generateCSV({ data, columns }) {
  if (!data || data.length === 0) return "";
  
  const rows = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ key, ...value }));

  const header = columns.map((col) => col.label);
  const body = rows.map((row) => {
    return columns
      .map((col) => {
        const val = getValueByPath(row, col.path);
        return escapeCSV(val ?? "");
      })
      .join(",");
  });

  return [header.join(","), ...body].join("\n");
}

function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function escapeCSV(value) {
  const str = String(value).replace(/"/g, '""');
  return /["\n,]/.test(str) ? `"${str}"` : str;
}

function flattenTokensForCsv(collection) {
  const result = [];

  if (!collection || !collection.colorTokens) {
    console.error("Cannot find theme data in output:", collection);
    return result;
  }

  const themesData = collection.colorTokens;

  ["light", "dark"].forEach((theme) => {
    const groups = themesData[theme];

    if (!groups) {
      console.warn(`No data for ${theme} theme`);
      return;
    }

    for (const group in groups) {
      const roles = groups[group];

      if (!roles) {
        console.warn(`No roles for group ${group} in ${theme} theme`);
        continue;
      }

      for (const role in roles) {
        const variations = roles[role];

        if (!variations) {
          console.warn(`No variations for role ${role} in group ${group}`);
          continue;
        }

        for (const variation in variations) {
          const item = variations[variation];

          result.push({
            theme: theme,
            group: group,
            role: item.role || role,
            variation: variation,
            value: item.value || "",
            tokenRef: item.tknRef || "",
            tokenName: item.tknName || "",
            contrastRatio: item.contrast?.ratio?.toFixed(2) || "0",
            contrastRating: item.contrast?.rating || "",
            isAdjusted: item.isAdjusted ? "Yes" : "No"
          });
        }
      }
    }
  });

  console.log(`Flattened ${result.length} tokens for CSV`);
  return result;
}

// Download CSV file
function downloadCSV(filename, csvString) {
  if (!csvString || csvString.length === 0) {
    alert("No data to export");
    return;
  }
  
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export all functions
if (typeof window !== 'undefined') {
  window.downloadCss = downloadCss;
  window.downloadCSV = downloadCSV;
  window.flattenTokensForCsv = flattenTokensForCsv;
  window.generateCSV = generateCSV;
  window.generateScss = generateScss;
}

// Export for module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    flattenToCss,
    generateCss,
    downloadCss,
    generateCSV,
    flattenTokensForCsv,
    downloadCSV,
    generateScss,
    generateSimpleCss,
    generateSeparateCssFiles
  };
}