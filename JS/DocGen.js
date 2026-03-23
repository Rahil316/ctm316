//Generate CSS file
function flattenToCss(collection) {
  const { raw, con, backgrounds } = collection;
  const cssVars = { light: {}, dark: {} };

  // Raw colors (common to both themes) - include leading '#'
  Object.entries(raw).forEach(([group, weights]) => {
    Object.entries(weights).forEach(([weight, data]) => {
      const varName = `--${slugify(group)}-${slugify(weight)}`;
      const value = normalizeHex(data.value) || "#000000";
      cssVars.light[varName] = value;
      cssVars.dark[varName] = value;
    });
  });

  // Contextual tokens reference raw color variables
  Object.entries(con).forEach(([theme, themeData]) => {
    Object.entries(themeData).forEach(([group, roles]) => {
      Object.entries(roles).forEach(([role, variations]) => {
        Object.entries(variations).forEach(([variation, data]) => {
          const ref = data.valueRef || "";
          const lastDash = ref.lastIndexOf("-");
          const refGroup = slugify(ref.substring(0, lastDash));
          const refWeight = slugify(ref.substring(lastDash + 1));
          const rawVarName = `--${refGroup}-${refWeight}`;
          cssVars[theme][
            `--${slugify(group)}-${slugify(role)}-${slugify(variation)}`
          ] = `var(${rawVarName})`;
        });
      });
    });
  });

  // Backgrounds (include #)
  cssVars.light["--bg-primary"] = normalizeHex(backgrounds.light) || "#FFFFFF";
  cssVars.dark["--bg-primary"] = normalizeHex(backgrounds.dark) || "#000000";

  return cssVars;
}

function generateCss(cssVars) {
  let css = `/* Color Tokens - Auto-generated */\n\n`;
  // Light theme (default)
  css += `:root {\n`;
  Object.entries(cssVars.light).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n\n`;

  // Dark theme using prefers-color-scheme
  css += `@media (prefers-color-scheme: dark) {\n  :root {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `    ${variable}: ${value};\n`;
  });
  css += `  }\n}\n\n`;

  // Utility `.dark` class
  css += `.dark {\n`;
  Object.entries(cssVars.dark).forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });
  css += `}\n`;
  return css;
}

// Handle different possible structures passed from the core data generator
function downloadCss() {
  try {
    // Get the current scheme
    const currentScheme = window.currentEditableScheme || colorScheme;
    console.log("Using scheme:", currentScheme.name);

    // Get the collection from the generator
    const collection = variableMaker(currentScheme);

    // Structure is now unified thanks to variableMaker update
    const { raw, ctx: con, backgrounds } = collection;

    console.log("Extracted data:", {
      rawKeys: Object.keys(raw),
      conKeys: Object.keys(con),
      backgrounds,
    });

    // Create a properly structured collection for flattenToCss
    const fixedCollection = { raw, con, backgrounds };
    const cssVars = flattenToCss(fixedCollection);
    const cssContent = generateCss(cssVars);
    const blob = new Blob([cssContent], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tokens.css";
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating CSS:", error);
    alert("Error generating CSS. Please check console for details.");
  }
}

//Generate CSV file
function generateCSV({ data, columns }) {
  const rows = Array.isArray(data)
    ? data
    : Object.entries(data).map(([key, value]) => ({ key, ...value }));

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
  return path
    .split(".")
    .reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function escapeCSV(value) {
  const str = String(value).replace(/"/g, '""');
  return /["\n,]/.test(str) ? `"${str}"` : str;
}

function flattenTokensForCsv(out) {
  const result = [];

  // Handle different possible structures from variableMaker
  let themesData;

  // Case 1: out has con property with light/dark themes
  if (out.con && out.con.light && out.con.dark) {
    themesData = out.con;
  }
  // Case 2: out has ctx property with light/dark themes
  else if (out.ctx && out.ctx.light && out.ctx.dark) {
    themesData = out.ctx;
  }
  // Case 3: out itself has light/dark themes
  else if (out.light && out.dark) {
    themesData = out;
  }
  // Case 4: Maybe con is at a different level
  else if (out.ctx && out.ctx.con) {
    themesData = out.ctx.con;
  } else {
    console.error("Cannot find theme data in output:", out);
    return result; // Return empty array instead of crashing
  }

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
            theme,
            group,
            role: item.roleName || role, // Use display name if available
            variation,
            weight: item.weight || "",
            value: item.value || "",
            contrastRatio: item.contrastRatio || 0,
            contrastRating: item.contrastRating || "",
          });
        }
      }
    }
  });

  console.log(`Flattened ${result.length} tokens for CSV`);
  return result;
}

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
