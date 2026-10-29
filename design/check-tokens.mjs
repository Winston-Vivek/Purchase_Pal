/**
 * Fails if apps/web/src/assets/main.css has drifted from the @theme block in
 * design/ui-guide.md §2.
 *
 *   npm run tokens:check
 *
 * The guide is locked and the frontend is required to use only its tokens. A
 * colour quietly edited in the stylesheet is the easy way for the built UI to
 * stop being the approved design, and nothing else would notice.
 */
import { readFileSync } from 'node:fs';

const guide = readFileSync('design/ui-guide.md', 'utf8');
const css = readFileSync('apps/web/src/assets/main.css', 'utf8');

const blocks = [...guide.matchAll(/```css\n(.*?)```/gs)].map((m) => m[1].trim());
if (blocks.length !== 1) {
  console.error(`ui-guide.md should hold exactly one css block; found ${blocks.length}`);
  process.exit(1);
}

const expected = blocks[0];
if (!css.includes(expected)) {
  console.error('main.css no longer matches the @theme block in design/ui-guide.md §2.');
  console.error('Either revert the stylesheet, or change the guide first — it is the locked spec.');
  process.exit(1);
}

const count = (expected.match(/^\s*--/gm) ?? []).length;
console.log(`tokens: main.css matches design/ui-guide.md §2 (${count} tokens)`);
