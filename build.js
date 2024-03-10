#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { build } from 'esbuild';
import { parse, serialize } from 'parse5';
import {
  query,
  createTextNode,
  isElementNode,
  setTextContent,
  getAttribute,
  removeAttribute,
} from '@parse5/tools';

await build({
  // step 1: bundle the contents of elements.js into a single javascript file (dist/elements.js)
  entryPoints: ['elements.js'],
  minify: true,
  bundle: true,
  outdir: 'dist',
  assetNames: '[name]',

  // step 2: copy the contents of dist/elements.js and INLINE them into the html file
  // in order that it should run when loaded as a file:/// url
  plugins: [
    {
      name: 'shahar-inline-bundle-plugin',
      setup(build) {
        build.onEnd(async result => {
          // step A: read the html file, and find the script tag
          const html = await readFile(new URL('./src/index.html', import.meta.url), 'utf-8');

          const tree = parse(html);

          // looks for an element that matches `<script type="module" src="elements.js"></script>`
          const node = query(tree, node =>
            isElementNode(node)
              && node.tagName == 'script'
              && getAttribute(node, 'src') === 'elements.js');

          if (!node)
            throw new Error('Could not find elements module script tag');

          removeAttribute(node, 'src');

          // step B: replace the script tag with our own bundle
          const js = await readFile(new URL('./dist/elements.js', import.meta.url), 'utf-8');

          setTextContent(node, js);

          // step C: write the new html file to dist/index.html
          await writeFile(new URL('./dist/index.html', import.meta.url), serialize(tree), 'utf-8');
        });
      },
    }
  ],
})
