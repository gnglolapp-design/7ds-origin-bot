import fs from 'node:fs/promises';
import { parseHideoutCharacterFromHtml } from './scripts/sources/hideout.mjs';
const html = await fs.readFile('/tmp/debug/gilthunder/00_loaded.html','utf8');
const res = parseHideoutCharacterFromHtml({html,url:'u'},'gilthunder');
console.log(JSON.stringify(res.weapons,null,2));
