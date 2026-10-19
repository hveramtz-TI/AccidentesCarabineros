import { geoArea, geoPath } from "d3-geo"
import { chileProjection, chileFeatureCollection } from "@/lib/region-geometry"
const SPHERE = 4 * Math.PI
const p = geoPath(chileProjection)
console.log("scale:", chileProjection.scale().toFixed(2))
let inverted = 0
for (const f of chileFeatureCollection.features) {
  const a = geoArea(f)
  const [min, max] = p.bounds(f)
  if (a > SPHERE / 2) inverted++
  console.log(`${f.properties.iso.padEnd(3)} area=${(a / SPHERE * 100).toFixed(3)}% | x[${min[0].toFixed(0)}..${max[0].toFixed(0)}] y[${min[1].toFixed(0)}..${max[1].toFixed(0)}]`)
}
const [fcMin, fcMax] = p.bounds(chileFeatureCollection)
console.log("FULL:", fcMin.map((n) => n.toFixed(0)).join(","), "→", fcMax.map((n) => n.toFixed(0)).join(","), "| invertidas:", inverted)
