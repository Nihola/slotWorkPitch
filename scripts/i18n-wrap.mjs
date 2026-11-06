// One-off codemod: wraps user-visible English strings in t(...). Re-runnable (already wrapped text is skipped). Usage: node scripts/i18n-wrap.mjs
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'

const ATTRS = new Set(['placeholder', 'aria-label', 'title', 'alt', 'label', 'hint', 'legend'])
const CALLS = new Set(['toast', 'setErr', 'setFail', 'setFormErr', 'setNameErr', 'setPwErr'])
const strings = new Set(); let changedFiles = 0
const CONST_FILES = ['src/features/onboarding/draft.ts', 'src/features/jobwizard/draft.ts', 'src/pages/admin/ui.ts', 'src/services/reportService.ts']   // .ts files that hold UI labels
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'i18n' ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.tsx') || CONST_FILES.includes(path.join(d, e.name).split(path.sep).join('/')) ? [path.join(d, e.name)] : [])
// Display-only constants (labels, step titles, weekday names). Never data that is sent to the server (categories, job types, cities).
const ARR = new Set(['DAYS', 'STEPS', 'COPY'])
const PROP = new Set(['label', 'text', 'desc', 'description', 'blurb'])
const TUPLE = { SECTIONS: 1, NAV: 1, KPIS: 0, CATS: 1, DEMOS: 0, STATUS: 0, S: 0 }
const STR_MAPS = new Set(['STATUS_LABEL', 'ACTION_LABEL'])
const moduleLevel = n => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p) || ts.isClassLike(p)) return false; return true }
const q = s => (s.includes("'") && !s.includes('"') ? `"${s}"` : `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
const hasLetters = s => /\p{L}/u.test(s)
const ENT = { '&amp;': '&', '&apos;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }

for (const file of walk('src')) {
  const text = fs.readFileSync(file, 'utf8'), sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  let declaresT = false
  ;(function scan(n) { if ((ts.isParameter(n) || ts.isVariableDeclaration(n) || ts.isBindingElement(n)) && ts.isIdentifier(n.name) && n.name.text === 't') declaresT = true; ts.forEachChild(n, scan) })(sf)
  const fn = declaresT ? 'tr' : 't', edits = []
  const wrapStr = (lit) => { const v = lit.text; if (!hasLetters(v)) return; strings.add(v); edits.push({ s: lit.getStart(), e: lit.getEnd(), r: `${fn}(${q(v)})` }) }
  const wrapExpr = (x) => {
    if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) return wrapStr(x)
    if (ts.isConditionalExpression(x)) { wrapExpr(x.whenTrue); wrapExpr(x.whenFalse) }
    else if (ts.isParenthesizedExpression(x)) wrapExpr(x.expression)
    else if (ts.isBinaryExpression(x) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(x.operatorToken.kind)) wrapExpr(x.right)
  }
  ;(function visit(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && moduleLevel(n)) {
      const name = n.name.text, init = n.initializer
      if (ARR.has(name) && ts.isArrayLiteralExpression(init)) init.elements.forEach(el => ts.isStringLiteral(el) && wrapStr(el))
      if (name in TUPLE) (function arrs(x) { if (ts.isArrayLiteralExpression(x)) { const el = x.elements[TUPLE[name]]; if (el && ts.isStringLiteral(el)) wrapStr(el) } ts.forEachChild(x, arrs) })(init)
      if (STR_MAPS.has(name) && ts.isObjectLiteralExpression(init)) init.properties.forEach(p => ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer) && wrapStr(p.initializer))
    }
    if (ts.isPropertyAssignment(n) && PROP.has(n.name.getText()) && ts.isStringLiteral(n.initializer) && moduleLevel(n)) wrapStr(n.initializer)
    if (ts.isJsxText(n)) {
      const m = n.text.match(/^(\s*)([\s\S]*?)(\s*)$/); let core = m[2].replace(/\s+/g, ' ')
      if (hasLetters(core)) {
        core = core.replace(/&[a-z#0-9]+;/gi, e => ENT[e] ?? e)
        if (!/&[a-z#0-9]+;/i.test(core)) { strings.add(core); edits.push({ s: n.pos, e: n.end, r: `${m[1]}{${fn}(${q(core)})}${m[3]}` }) }
      }
    } else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText()) && n.initializer) {
      if (ts.isStringLiteral(n.initializer)) { const v = n.initializer.text; if (hasLetters(v)) { strings.add(v); edits.push({ s: n.initializer.getStart(), e: n.initializer.getEnd(), r: `{${fn}(${q(v)})}` }) } }
      else if (ts.isJsxExpression(n.initializer) && n.initializer.expression) wrapExpr(n.initializer.expression)
    } else if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) wrapExpr(n.expression)
    else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && CALLS.has(n.expression.text) && n.arguments[0]) wrapExpr(n.arguments[0])
    ts.forEachChild(n, visit)
  })(sf)
  if (!edits.length) continue
  edits.sort((a, b) => b.s - a.s); let out = text
  for (const e of edits) out = out.slice(0, e.s) + e.r + out.slice(e.e)
  const imports = sf.statements.filter(ts.isImportDeclaration), last = imports[imports.length - 1]
  let rel = path.relative(path.dirname(file), path.join('src', 'i18n')).split(path.sep).join('/'); if (!rel.startsWith('.')) rel = './' + rel
  const imp = `import { t${declaresT ? ' as tr' : ''} } from '${rel}'\n`
  const at = last ? last.getEnd() + 1 : 0   // after the last import line
  if (!text.includes(imp.trim())) out = out.slice(0, at) + imp + out.slice(at)   // idempotent: never add the import twice
  fs.writeFileSync(file, out); changedFiles++
}
fs.writeFileSync('scripts/i18n-strings.json', JSON.stringify([...strings].sort(), null, 1))
console.log(`wrapped ${strings.size} unique strings in ${changedFiles} files`)
