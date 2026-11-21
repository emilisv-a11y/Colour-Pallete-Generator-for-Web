// Integration test for the PHP API. Needs a fresh database and the local server (server/dev/start.sh).
//   node server/dev/api-test.mjs [http://127.0.0.1:8080]
const BASE = process.argv[2] ?? 'http://127.0.0.1:8080'
let passed = 0
const failures = []
const check = (name, cond, extra = '') => (cond ? passed++ : failures.push(`${name} ${extra}`))

function client() {
  let cookie = ''
  return async (method, path, body, headers = {}) => {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'd5wt', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0]
    let json = null
    try {
      json = await res.json()
    } catch {}
    return { status: res.status, json }
  }
}

async function setup(form) {
  const res = await fetch(`${BASE}/api/setup.php`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) })
  return { status: res.status, text: await res.text() }
}

const DB = { db_host: 'localhost', db_name: 'd5wt', db_user: 'd5wt', db_pass: 'd5wt-local' }
const OWNER = { name: 'Emilis', email: 'owner@example.com', password: 'correct horse battery' }

// ---------- setup ----------
let r = await setup({ ...DB, db_host: 'evil.example.com', ...OWNER })
check('setup rejects remote db host', r.text.includes('must be'))
r = await setup({ ...DB, db_pass: 'wrong', ...OWNER })
check('setup reports bad db password', r.text.includes('Could not connect'))
r = await setup({ ...DB, ...OWNER, password: 'short' })
check('setup rejects short password', r.text.includes('at least 10'))
r = await setup({ ...DB, ...OWNER })
check('setup completes', r.text.includes('All set'), r.text.slice(0, 300))
r = await setup({ ...DB, ...OWNER, email: 'attacker@example.com' })
check('setup locks afterwards', r.status === 403 && r.text.includes('already complete'))

const anon = client()
r = await anon('GET', '/health')
check('health ready', r.json?.ready === true)
r = await anon('POST', '/sync', { since: 0, items: [] })
check('sync needs sign-in', r.status === 401)

// ---------- auth ----------
const a = client()
r = await a('POST', '/auth/login', { email: OWNER.email, password: 'nope nope nope' })
check('wrong password', r.status === 401)
r = await a('POST', '/auth/login', { email: OWNER.email, password: OWNER.password }, { 'X-Requested-With': '' })
check('login needs app header (CSRF)', r.status === 403)
r = await a('POST', '/auth/login', { email: 'OWNER@example.com', password: OWNER.password })
check('login (case-insensitive email)', r.status === 200 && r.json.user.role === 'owner', JSON.stringify(r.json))
r = await a('GET', '/auth/me')
check('me', r.json?.user?.email === OWNER.email)

const brute = client()
let last
for (let i = 0; i < 11; i++) last = await brute('POST', '/auth/login', { email: 'victim@example.com', password: 'x' + i })
check('login rate limit', last.status === 429)

// ---------- team ----------
r = await a('POST', '/users', { email: 'designer@example.com', name: 'Designer', password: 'temporary-pass-1' })
check('owner adds member', r.status === 200 && r.json.users.length === 2)
r = await a('POST', '/users', { email: 'designer@example.com', name: 'Again', password: 'temporary-pass-1' })
check('duplicate member rejected', r.status === 409)
const b = client()
r = await b('POST', '/auth/login', { email: 'designer@example.com', password: 'temporary-pass-1' })
check('member signs in and must change password', r.json?.user?.mustChangePassword === true)
r = await b('POST', '/users', { email: 'x@example.com', password: 'whatever-123' })
check('member cannot add users', r.status === 403)
r = await b('POST', '/auth/password', { current: 'temporary-pass-1', password: 'designer-own-pass' })
check('member changes password', r.status === 200)
r = await b('GET', '/auth/me')
check('flag cleared', r.json?.user?.mustChangePassword === false)

// ---------- sync ----------
r = await a('POST', '/sync', { since: 0, items: [{ kind: 'project', id: 'p1', updatedAt: 1000, data: { name: 'Bakery', notes: 'ąčęėįšųūž „quotes“' } }] })
check('push project', r.json?.accepted === 1, JSON.stringify(r.json))
const seqA = r.json.seq
r = await b('POST', '/sync', { since: 0, items: [] })
const p1 = r.json.items.find((x) => x.id === 'p1')
check('other device pulls it (unicode intact)', p1?.data?.notes === 'ąčęėįšųūž „quotes“')
r = await b('POST', '/sync', { since: r.json.seq, items: [{ kind: 'project', id: 'p1', updatedAt: 900, data: { name: 'Stale edit' } }] })
check('older edit loses', r.json.accepted === 0 && r.json.rejected[0]?.reason === 'older')
r = await b('POST', '/sync', { since: r.json.seq, items: [{ kind: 'project', id: 'p1', updatedAt: 2000, data: { name: 'Bakery v2' } }, { kind: 'palette', id: 'pal1', updatedAt: 2000, data: { colors: ['#000000'] } }] })
check('newer edits win', r.json.accepted === 2)
r = await a('POST', '/sync', { since: seqA, items: [] })
check('first device receives only newer changes', r.json.items.length === 2 && r.json.items.some((x) => x.data?.name === 'Bakery v2'))
r = await a('POST', '/sync', { since: r.json.seq, items: [{ kind: 'palette', id: 'pal1', updatedAt: 3000, deleted: true }] })
check('delete accepted', r.json.accepted === 1)
r = await b('POST', '/sync', { since: 0, items: [] })
check('tombstone delivered', r.json.items.find((x) => x.id === 'pal1')?.deleted === true)
r = await a('POST', '/sync', { since: 0, items: [{ kind: 'evil', id: 'x', updatedAt: 1 }, { kind: 'project', id: "1' OR '1'='1", updatedAt: 1 }, { kind: 'project', id: 'p2', updatedAt: '5' }] })
check('invalid items rejected', r.json.accepted === 0 && r.json.rejected.length === 3)

// ---------- reviews ----------
const snapshot = { project: { name: 'Bakery', client: 'UAB Duona' }, sections: { brand: true }, options: [{ id: 'o1', label: 'Warm', colors: ['#e76f51'] }] }
r = await a('POST', '/reviews', { projectId: 'p1', title: 'Round 1', lang: 'lt', snapshot, pin: '4821', expiresAt: '2099-12-31' })
check('create review link', r.status === 200 && r.json.review.hasPin && r.json.review.token.length >= 30, JSON.stringify(r.json))
const rev = r.json.review
const client1 = client()
r = await client1('GET', `/r/${rev.token}`)
check('PIN required', r.status === 401 && r.json.pin === true && r.json.lang === 'lt')
r = await client1('GET', `/r/${rev.token}`, undefined, { 'X-Review-Pin': '0000' })
check('wrong PIN', r.status === 401)
r = await client1('GET', `/r/${rev.token}`, undefined, { 'X-Review-Pin': '4821' })
check('client opens review', r.status === 200 && r.json.snapshot.options[0].label === 'Warm' && r.json.lang === 'lt')
r = await client1('POST', `/r/${rev.token}/events`, { kind: 'comment', item: 'brand', author: 'Rūta', body: 'Gražu!' }, { 'X-Review-Pin': '4821', 'X-Requested-With': '' })
check('client post needs header', r.status === 403)
r = await client1('POST', `/r/${rev.token}/events`, { kind: 'comment', item: 'brand', author: 'Rūta', body: 'Gražu!' }, { 'X-Review-Pin': '4821' })
check('client comments', r.status === 200 && r.json.events.length === 1)
r = await client1('POST', `/r/${rev.token}/events`, { kind: 'choice', item: 'option:o1', author: 'Rūta' }, { 'X-Review-Pin': '4821' })
check('client picks option', r.status === 200)
r = await client1('POST', `/r/${rev.token}/events`, { kind: 'approve', item: 'general', author: 'Rūta', body: 'Tvirtinu' }, { 'X-Review-Pin': '4821' })
check('client approves', r.json?.approval?.author === 'Rūta')
r = await client1('POST', `/r/${rev.token}/events`, { kind: 'comment', item: 'brand', author: 'Rūta' }, { 'X-Review-Pin': '4821' })
check('empty comment rejected', r.status === 400)
r = await a('GET', '/reviews?project=p1')
check('owner sees counts and approval', r.json.reviews[0].counts.comment === 1 && r.json.reviews[0].counts.choice === 1 && r.json.reviews[0].approval?.author === 'Rūta' && r.json.reviews[0].views === 1)
r = await a('POST', `/reviews/${rev.id}/events`, { item: 'brand', body: 'Ačiū!' })
check('owner replies', r.json.events.at(-1)?.fromOwner === true)
r = await a('PATCH', `/reviews/${rev.id}`, { snapshot: { ...snapshot, options: [] }, pin: null })
check('update snapshot and remove PIN', r.json.review.hasPin === false)
r = await client1('GET', `/r/${rev.token}`)
check('open without PIN now', r.status === 200 && r.json.snapshot.options.length === 0)
r = await a('PATCH', `/reviews/${rev.id}`, { expiresAt: '2020-01-01' })
r = await client1('GET', `/r/${rev.token}`)
check('expired link', r.status === 410)
r = await a('PATCH', `/reviews/${rev.id}`, { expiresAt: null, active: false })
r = await client1('GET', `/r/${rev.token}`)
check('switched-off link', r.status === 404)
r = await client1('GET', `/r/${"x' OR 1=1 --"}`)
check('garbage token', r.status === 404)
r = await a('DELETE', `/reviews/${rev.id}`)
r = await a('GET', '/reviews?project=p1')
check('delete link', r.json.reviews.length === 0)

// ---------- limits ----------
r = await a('POST', '/sync', 'x'.repeat(9 * 1024 * 1024))
check('oversized body rejected', r.status === 413)
r = await a('POST', '/auth/logout-all')
r = await a('GET', '/auth/me')
check('sign out everywhere', r.json.user === null)

console.log(`${passed} passed, ${failures.length} failed`)
failures.forEach((f) => console.log('  FAIL', f))
process.exit(failures.length ? 1 : 0)
