import fs from "node:fs";

const currentVersion = JSON.parse(fs.readFileSync("./package.json", "utf-8")).version;

export default currentVersion;
