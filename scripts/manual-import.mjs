import { importByUrl } from "../lib/importers/manual.ts";
const r = await importByUrl(process.argv[2]);
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 2);
