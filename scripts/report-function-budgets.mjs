import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
const root = fs.realpathSync(process.cwd()),
  cache = new Map();
function compressed(file) {
  const real = fs.realpathSync(file);
  if (!real.startsWith(root + path.sep))
    throw Error("Build trace leaves project");
  if (cache.has(real)) return cache.get(real);
  const data = fs.readFileSync(real),
    value = { raw: data.length, gzip: gzipSync(data).length };
  cache.set(real, value);
  return value;
}
function files(dir, suffix) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name), suffix)
        : entry.name.endsWith(suffix)
          ? [path.join(dir, entry.name)]
          : [],
    );
}
const traces = files(".next/server/app/api", ".nft.json");
if (!traces.length) throw Error("Production API traces are missing");
const routes = traces
  .map((trace) => {
    const packet = JSON.parse(fs.readFileSync(trace, "utf8")),
      dependencies = new Set([
        fs.realpathSync(trace.replace(".nft.json", "")),
        ...packet.files.map((file) =>
          fs.realpathSync(path.resolve(path.dirname(trace), file)),
        ),
      ]);
    let raw = 0,
      gzip = 0;
    for (const file of dependencies) {
      const value = compressed(file);
      raw += value.raw;
      gzip += value.gzip;
    }
    return {
      route: path
        .relative(".next/server/app/api", trace)
        .replace("/route.js.nft.json", ""),
      files: dependencies.size,
      raw,
      gzip,
    };
  })
  .sort((a, b) => b.gzip - a.gzip);
const apiLimit = 3 * 1048576,
  adapterLimit = 2 * 1048576;
const chunks = files(".next/static/chunks", ".js");
let allClient = 0;
for (const file of chunks) allClient += compressed(file).gzip;
// Counting every client chunk is a conservative upper bound for each lazy
// wallet adapter, including its shared chunks and the initial application.
console.log(
  `API trace maximum: ${(routes[0].gzip / 1048576).toFixed(3)} MiB gzip, ${(routes[0].raw / 1048576).toFixed(3)} MiB raw, ${routes[0].files} files (${routes.length} routes; limit3 MiB).`,
);
console.log(
  `All client chunks: ${(allClient / 1048576).toFixed(3)} MiB gzip (${chunks.length} chunks; conservative per-adapter bound2 MiB).`,
);
console.log(
  "Trace dependencies are independently compressed; these are local build bounds, not a measured hosted function artifact or capacity claim.",
);
if (routes[0].gzip > apiLimit)
  throw Error("API trace exceeds compressed budget");
if (allClient > adapterLimit)
  throw Error("Conservative wallet adapter bound exceeds budget");
console.log(JSON.stringify({api_trace_gzip_bytes:routes[0].gzip,all_client_gzip_bytes:allClient}));
const baseline = JSON.parse(
  fs.readFileSync("scripts/bundle-baseline.json", "utf8"),
);
if (
  routes[0].gzip > baseline.api_trace_gzip_bytes * 1.1 ||
  allClient > baseline.all_client_gzip_bytes * 1.1
)
  throw Error(
    "Bundle exceeds10% regression budget; review the dependency change and deliberate baseline update",
  );
