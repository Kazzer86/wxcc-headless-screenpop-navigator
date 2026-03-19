const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/screenpop-navigator.js",
  experiments: {
    outputModule: false,
  },
  output: {
    filename: "screenpop-navigator.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  module: {
    parser: {
      javascript: {
        importMeta: false,
      },
    },
  },
};
