const fs = require("fs");
const path = require("path");

const templatesDirectory = path.join(__dirname, "..", "templates");

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Values like a customer name come from user input, so they cannot go into HTML raw.
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

// Replaces every {{ key }} placeholder in a template file with the value given.
function renderTemplate(fileName, values) {
  const template = fs.readFileSync(
    path.join(templatesDirectory, fileName),
    "utf8"
  );
  const isHtml = fileName.endsWith(".html");

  return template.replace(/{{\s*(\w+)\s*}}/g, (placeholder, key) => {
    if (!(key in values)) {
      return placeholder;
    }

    const value = String(values[key]);

    return isHtml ? escapeHtml(value) : value;
  });
}

module.exports = renderTemplate;
