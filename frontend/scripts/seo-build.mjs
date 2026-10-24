#!/usr/bin/env node
/**
 * Post-build SEO step (SEO Phase 1, T2/T7).
 *
 * `src/data/route-meta.json` is the single source of truth. From the Vite
 * template this script emits one static HTML file per route with unique head
 * tags and a minimal H1/intro inside `#root`, plus `404.html` and
 * `sitemap.xml`. React replaces the prerendered block on mount, so the static
 * copy is only a crawlable first paint, never a second document.
 *
 * Run it after `vite build`; it fails loudly when the template shape changes so
 * a silent regression cannot ship a page with the wrong head.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("..", import.meta.url))
const distDir = join(projectRoot, "dist")
const metaPath = join(projectRoot, "src", "data", "route-meta.json")
const templatePath = join(distDir, "index.html")

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])
}

function absoluteUrl(route) {
  return route.path ? `${routeMeta.origin}${route.path}` : null
}

function headTags(route) {
  const canonical = absoluteUrl(route)
  const tags = [
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<meta name="robots" content="${route.noindex ? "noindex, follow" : "index, follow"}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(routeMeta.siteName)}" />`,
    `<meta property="og:locale" content="es_CL" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
  ]

  if (canonical) {
    tags.splice(1, 0, `<link rel="canonical" href="${canonical}" />`)
    tags.push(`<meta property="og:url" content="${canonical}" />`)
  }

  return tags
}

function prerenderBlock(route) {
  return [
    '<div id="seo-static" style="max-width:42rem;margin:0 auto;padding:2rem 1rem;',
    'font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.6">',
    `<h1 style="margin:0 0 0.75rem;font-size:1.5rem;line-height:1.25;font-weight:600">${escapeHtml(route.h1)}</h1>`,
    `<p style="margin:0">${escapeHtml(route.intro)}</p>`,
    "</div>",
  ].join("")
}

function renderDocument(template, route) {
  let html = template

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`)
  html = html.replace(/^[ \t]*<meta\s+name="(?:description|robots)"[^>]*>\r?\n/gim, "")
  html = html.replace(/^[ \t]*<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>\r?\n/gim, "")
  html = html.replace(/^[ \t]*<link\s+rel="canonical"[^>]*>\r?\n/gim, "")

  const head = headTags(route)
    .map((tag) => `    ${tag}`)
    .join("\n")
  html = html.replace(/<\/head>/i, `${head}\n  </head>`)

  const rootMarker = '<div id="root"></div>'
  if (!html.includes(rootMarker)) {
    throw new Error(
      `dist/index.html no longer contains ${rootMarker}; update scripts/seo-build.mjs`,
    )
  }
  html = html.replace(rootMarker, `<div id="root">${prerenderBlock(route)}</div>`)

  return html
}

function outputPath(route) {
  return route.path === "/"
    ? join(distDir, "index.html")
    : join(distDir, `${route.path.slice(1)}.html`)
}

function sitemapXml(routes, lastmod) {
  const entries = routes
    .filter((route) => route.path && !route.noindex)
    .map((route) => {
      const loc = escapeHtml(absoluteUrl(route))
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    })
    .join("\n")

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n")
}

const routeMeta = JSON.parse(await readFile(metaPath, "utf8"))
const template = await readFile(templatePath, "utf8")
const routes = Object.values(routeMeta.routes)

const seenPaths = new Set()
for (const route of routes) {
  if (!route.path) continue
  if (seenPaths.has(route.path)) {
    throw new Error(`duplicate route path in route-meta.json: ${route.path}`)
  }
  seenPaths.add(route.path)
}

const notFound = routeMeta.routes["not-found"]
if (!notFound) {
  throw new Error('route-meta.json must define a "not-found" entry')
}

for (const route of routes) {
  if (!route.path) continue
  const destination = outputPath(route)
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, renderDocument(template, route), "utf8")
}

await writeFile(join(distDir, "404.html"), renderDocument(template, notFound), "utf8")

const epoch = process.env.SOURCE_DATE_EPOCH
const lastmod = new Date(epoch ? Number(epoch) * 1000 : Date.now())
  .toISOString()
  .slice(0, 10)
await writeFile(join(distDir, "sitemap.xml"), sitemapXml(routes, lastmod), "utf8")

const indexable = routes.filter((route) => route.path && !route.noindex).length
console.log(
  `seo-build: prerendered ${routes.filter((route) => route.path).length} routes, ` +
    `${indexable} indexable URLs, 404.html, sitemap.xml (lastmod ${lastmod})`,
)
