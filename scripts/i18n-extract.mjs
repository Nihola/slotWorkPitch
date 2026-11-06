// Lists every English source string used with t()/tr()/plural() in src/ and which are missing from the ru/uz dictionaries.
// Usage: node scripts/i18n-extract.mjs [--missing ru|uz]
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : [])
const found = new Set()
const lit = n => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null
for (const f of walk('src')) {
  if (f.includes(`${path.sep}i18n${path.sep}`) && !f.endsWith('notifications.ts') && !f.endsWith('serverMessages.ts')) continue
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  ;(function v(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const name = n.expression.text
      if ((name === 't' || name === 'tr') && lit(n.arguments[0])) found.add(lit(n.arguments[0]))
      if (name === 'plural' && n.arguments[1] && ts.isObjectLiteralExpression(n.arguments[1])) n.arguments[1].properties.forEach(p => ts.isPropertyAssignment(p) && p.name.getText() === 'other' && lit(p.initializer) && found.add(lit(p.initializer)))   // `other` is the dictionary key for all plural forms
    }
    if (f.endsWith('serverMessages.ts') && ts.isArrayLiteralExpression(n)) n.elements.forEach(el => lit(el) && found.add(lit(el)))
    if (f.endsWith('notifications.ts') && ts.isPropertyAssignment(n) && lit(n.initializer) && ts.isObjectLiteralExpression(n.parent)) found.add(lit(n.initializer))
    ts.forEachChild(n, v)
  })(sf)
}
const all = [...found].sort()
const which = process.argv[process.argv.indexOf('--missing') + 1]
if (process.argv.includes('--missing')) {
  const src = fs.readFileSync(`src/i18n/${which}.ts`, 'utf8'), have = new Set([...src.matchAll(/(["'])((?:\\.|(?!\1).)*)\1\s*:\s*["'`]/g)].map(m => m[2].replace(/\\(["'\\])/g, '$1')))
  const miss = all.filter(s => !have.has(s)); console.log(`${which}: ${all.length - miss.length}/${all.length} translated (${Math.round(100 * (all.length - miss.length) / all.length)}%)`); if (process.argv.includes('--list')) miss.forEach(s => console.log(JSON.stringify(s)))
} else { fs.writeFileSync('scripts/i18n-strings.json', JSON.stringify(all, null, 1)); console.log(all.length, 'strings') }
