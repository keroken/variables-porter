console.clear();

if (figma.command === "import") {
  figma.showUI(__uiFiles__["import"], {
    width: 500,
    height: 500,
    themeColors: true,
  });
} else if (figma.command === "export") {
  figma.showUI(__uiFiles__["export"], {
    width: 500,
    height: 500,
    themeColors: true,
  });
}

figma.ui.onmessage = (msg) => {
  if (msg.type === "EXPORT") {
    console.log("exporting");
    exportToJSON();

  } else if (msg.type === "IMPORT") {
    console.log("importing");
  }
};

async function exportToJSON() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const files: { fileName: string; body: object }[] = [];
  collections.forEach((collection) => {
    const collectionFiles = processCollection(collection);
    files.push(...collectionFiles);
  });
  figma.ui.postMessage({ type: "EXPORT_RESULT", files});
}

function processCollection({ name, modes, variableIds }: VariableCollection) {
  const files: { fileName: string; body: object }[] = [];
  modes.forEach((mode) => {
    const file =  { fileName: `${name}.${mode.name}.tokens.json`, body: {} };
    variableIds.forEach( async (variableId) => {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (variable !== null) {
        const { name, description, resolvedType, valuesByMode } = variable;
        const value = valuesByMode[mode.modeId];
        console.log(name, value, description, resolvedType);

        if (value !== undefined && ["COLOR", "FLOAT"].includes(resolvedType)) {
            let obj: {[key: string]: unknown} = file.body;
            name.split("/").forEach((groupName) => {
              obj[groupName] = obj[groupName] || {};
              obj = obj[groupName] as {[key: string]: unknown};
            });
            obj.$type = resolvedType === "COLOR" ? "color" : "number";
            obj.$description = description ?? '';

          if (Object.values(value)[0] === "VARIABLE_ALIAS") {
            const variable = await figma.variables.getVariableByIdAsync(Object.values(value)[1]);
            obj.$value = `{${variable?.name.replace(/\//g, ".")}}`;

          } else if (resolvedType === "COLOR") {
            obj.$value = `rgb(${Object.values(value).join(", ")})`;

          } else {
            obj.$value = Object.values(value)[0];
          }
        }
      }
    });
    files.push(file);
  });
  return files;
}