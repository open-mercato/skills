import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const engine = readFileSync(new URL('../skills/om-ux-design/references/assets/prototype.js', import.meta.url), 'utf8')
const storageKey = (prototypeId) => `om-prototype-comments:v2:${prototypeId}`
const plain = (value) => JSON.parse(JSON.stringify(value))

// A small DOM adapter runs the shipped IIFE without exposing or copying its
// private functions. Tests drive registered event handlers and inspect rendered
// text, downloads and storage. Browser layout/keyboard QA remains a separate gate.
class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase()
    this.document = document
    this.children = []
    this.attributes = new Map()
    this.listeners = new Map()
    this.style = {}
    this.ownText = ''
    this.value = ''
    this.classList = {
      contains: (name) => this.className.split(/\s+/).includes(name),
      add: (name) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), name])].join(' ') },
      remove: (name) => { this.className = this.className.split(/\s+/).filter((part) => part !== name).join(' ') },
      toggle: (name, enabled = !this.classList.contains(name)) => {
        this.classList[enabled ? 'add' : 'remove'](name)
        return enabled
      },
    }
  }
  get id() { return this.getAttribute('id') || '' }
  get className() { return this.getAttribute('class') || '' }
  set className(value) { this.setAttribute('class', value) }
  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join('') }
  set textContent(value) {
    this.children.forEach((child) => { child.parentElement = null })
    this.children = []
    this.ownText = String(value)
  }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  setAttribute(name, value) {
    this.attributes.set(name, String(value))
    if (name === 'value') this.value = String(value)
  }
  appendChild(child) {
    child.remove()
    child.parentElement = this
    this.children.push(child)
    return child
  }
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this)
      this.parentElement = null
    }
  }
  addEventListener(type, handler) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), handler])
  }
  matches(selector) {
    return selector.split(',').some((item) => {
      const parts = item.trim().split(/\s+/)
      let cursor = this
      if (!cursor.matchesSimple(parts.pop())) return false
      while (parts.length) {
        const ancestor = parts.pop()
        cursor = cursor.parentElement
        while (cursor && !cursor.matchesSimple(ancestor)) cursor = cursor.parentElement
        if (!cursor) return false
      }
      return true
    })
  }
  matchesSimple(selector) {
    // Refuse unsupported syntax, including unescaped imported IDs. Silently
    // accepting it would hide the real browser SyntaxError this suite regresses.
    const attribute = selector.match(/\[([\w-]+)(?:([\^]?=)"([^"]*)")?\]/)
    const simple = selector.replace(/\[[^\]]+\]/g, '')
    if (!/^(?:[a-z][a-z0-9-]*)?(?:[.#][\w-]+)*$/i.test(simple)) {
      throw new SyntaxError(`Invalid or unsupported selector: ${selector}`)
    }
    const tag = simple.match(/^[a-z][a-z0-9-]*/i)?.[0]
    if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) return false
    for (const match of simple.matchAll(/([.#])([\w-]+)/g)) {
      if (match[1] === '#' ? this.id !== match[2] : !this.classList.contains(match[2])) return false
    }
    if (!attribute) return true
    const value = this.getAttribute(attribute[1])
    return value !== null && (!attribute[2] || (attribute[2] === '^=' ? value.startsWith(attribute[3]) : value === attribute[3]))
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [child, ...child.descendants()]).filter((child) => child.matches(selector))
  }
  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]) }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null }
  getBoundingClientRect() { return { top: 0, left: 0, right: 100, bottom: 40 } }
  scrollIntoView() {}
  focus() { this.document.activeElement = this }
  click() {
    this.document.dispatch('click', this)
    if (this.tagName === 'A' && this.getAttribute('download')) {
      this.document.downloads.push({ name: this.getAttribute('download'), blob: this.document.urls.get(this.getAttribute('href')) })
    }
  }
}

function boot({ prototypeId = 'booking-design', operations = [], committedId = prototypeId, storage = new Map(), screenIds = ['overview', 'details'] } = {}) {
  const document = {
    listeners: new Map(), urls: new Map(), downloads: [],
    createElement(tag) { return new Element(tag, this) },
    addEventListener(type, handler) { this.listeners.set(type, [...(this.listeners.get(type) || []), handler]) },
    querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector) },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null },
    getElementById(id) { return this.documentElement.descendants().find((node) => node.id === id) || null },
    dispatch(type, target, properties = {}) {
      const event = { target, preventDefault() {}, stopPropagation() { this.stopped = true }, ...properties }
      for (const handler of this.listeners.get(type) || []) handler(event)
      for (let node = target; node && !event.stopped; node = node.parentElement) {
        for (const handler of node.listeners.get(type) || []) handler(event)
      }
    },
  }
  const append = (parent, tag, attributes = {}, text = '') => {
    const node = document.createElement(tag)
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value))
    node.textContent = text
    parent.appendChild(node)
    return node
  }
  document.documentElement = document.createElement('html')
  document.documentElement.setAttribute('data-prototype-id', prototypeId)
  document.body = append(document.documentElement, 'body')
  const header = append(document.body, 'header', { class: 'doc-head' })
  append(header, 'h1', {}, 'Booking design')
  append(document.body, 'div', { class: 'doc-toolbar' })
  const nav = append(document.body, 'nav', { class: 'screen-nav' })
  const targets = new Map()
  screenIds.forEach((id, index) => {
    append(nav, 'a', { href: `#${id}` }, `Screen ${index + 1}`)
    const screen = append(document.body, 'section', { id, class: 'screen' })
    const meta = append(screen, 'header', { class: 'screen-meta' })
    append(meta, 'h2', {}, `Screen ${index + 1}`)
    const frame = append(screen, 'div', { class: 'frame' })
    targets.set(id, append(frame, 'button', { type: 'button' }, `Action ${index + 1}`))
  })
  let sequence = 0
  let milliseconds = Date.UTC(2026, 0, 1)
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [milliseconds++])) }
  }
  const committed = { version: 2, prototypeId: committedId, operations: plain(operations) }
  const window = {
    __OM_PROTOTYPE_COMMENTS__: committed,
    crypto: { randomUUID: () => `test-${++sequence}` },
    listeners: new Map(),
    addEventListener: document.addEventListener,
    scrollTo() {},
  }
  const context = {
    document, window, Blob, Date: Clock,
    URL: {
      createObjectURL(blob) { const id = `blob:${++sequence}`; document.urls.set(id, blob); return id },
      revokeObjectURL(id) { document.urls.delete(id) },
    },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout() {}, clearTimeout() {}, confirm: () => true,
  }
  runInNewContext(engine, context, { filename: 'prototype.js' })
  document.dispatch('DOMContentLoaded', document.body)
  const click = (label) => {
    const node = document.querySelectorAll('button').find((button) => button.textContent === label)
    assert.ok(node, `Rendered button exists: ${label}`)
    node.click()
  }
  const input = (placeholder, value) => {
    const node = document.querySelectorAll('input, textarea').find((field) => field.getAttribute('placeholder') === placeholder)
    assert.ok(node, `Rendered field exists: ${placeholder}`)
    node.value = value
    document.dispatch('input', node)
  }
  const download = async (label) => {
    click(label)
    const item = document.downloads.at(-1)
    assert.ok(item, 'Export produces a download')
    return { name: item.name, content: await item.blob.text() }
  }
  const exportOperations = async () => {
    const output = await download('Export for repository')
    assert.equal(output.name, 'comments.js')
    const importedWindow = {}
    runInNewContext(output.content, { window: importedWindow })
    return plain(importedWindow.__OM_PROTOTYPE_COMMENTS__)
  }
  return { document, window, click, input, download, exportOperations, storage, targets, committed }
}

function create(threadId, screen = 'overview', anchor = 'div>button', at = '2024-01-01T00:00:00.000Z') {
  return {
    id: `create-${threadId}`, type: 'create', threadId, at,
    payload: { screen, anchor, label: `Target ${threadId}`, message: { id: `message-${threadId}`, author: 'Reviewer', text: `Keep feedback ${threadId}`, at } },
  }
}

for (const [description, screenIds] of [
  ['CSS metacharacters', ['17:review[detail]"']],
  ['inherited object keys', ['__proto__', 'constructor']],
]) test(`imported screen IDs containing ${description} render and export`, async () => {
  const app = boot({ screenIds, operations: screenIds.map((id, index) => create(`thread-${index}`, id)) })
  app.click('Threads')
  assert.equal(app.document.querySelectorAll('.anno-thread').length, screenIds.length)
  assert.deepEqual(app.document.querySelectorAll('.anno-pin').map((pin) => pin.textContent), screenIds.map(() => '1'))
  const markdown = await app.download('Export Markdown')
  assert.equal(markdown.name, 'prototype-feedback.md')
  screenIds.forEach((id, index) => assert.ok(markdown.content.includes(`## Screen ${index + 1}\n`)))
  assert.equal((markdown.content.match(/Keep feedback/g) || []).length, screenIds.length)
})

test('new comments, replies and resolve/reopen survive reload without changing committed operations', async () => {
  const base = create('existing')
  const app = boot({ operations: [base] })
  app.click('Comment')
  app.input('Your name for review comments', 'Alex')
  app.targets.get('details').click()
  app.input('What should change?', '  Explain this price\nincluding tax.  ')
  app.click('Add comment')
  app.input('Reply…', 'Use the same rule on mobile.')
  app.click('Reply')
  app.click('Resolve')
  assert.match((await app.download('Export Markdown')).content, /\_\(resolved\)\_/)
  app.click('Reopen')
  const exported = await app.exportOperations()
  assert.deepEqual(exported.operations.map((operation) => operation.type), ['create', 'create', 'reply', 'set-resolved', 'set-resolved'])
  assert.deepEqual(app.committed.operations, [base])
  const local = JSON.parse(app.storage.get(storageKey('booking-design')))
  assert.equal(local.version, 2)
  assert.equal(local.operations.length, 4)
  assert.equal(local.operations[0].payload.message.author, 'Alex')
  assert.equal(local.operations[0].payload.message.text, 'Explain this price\nincluding tax.')

  const reloaded = boot({ operations: [base], storage: app.storage })
  reloaded.click('Threads')
  assert.equal(reloaded.document.querySelectorAll('.anno-thread').length, 2)
  assert.match(reloaded.document.querySelector('.anno-panel').textContent, /Use the same rule on mobile\./)
  assert.deepEqual((await reloaded.exportOperations()).operations, exported.operations)
  const committedReload = boot({ operations: exported.operations, storage: app.storage })
  committedReload.click('Threads')
  assert.equal(committedReload.document.querySelector('.anno-dirty-note'), null)
  assert.deepEqual((await committedReload.exportOperations()).operations, exported.operations)
})

test('missing screens and anchors retain feedback and re-anchor persists the original thread', async () => {
  const base = create('missing-screen', 'deleted-screen')
  const missingAnchor = create('missing-anchor', 'overview', 'div>input')
  const app = boot({ operations: [base, missingAnchor] })
  app.click('Threads')
  assert.equal(app.window.__prototypeOrphans.length, 2)
  const markdown = await app.download('Export Markdown')
  assert.match(markdown.content, /## deleted-screen/)
  assert.match(markdown.content, /Keep feedback missing-screen/)
  assert.match(markdown.content, /Keep feedback missing-anchor/)
  app.document.querySelectorAll('.anno-orphans .anno-thread').find((card) => card.textContent.includes('Keep feedback missing-screen')).click()
  app.click('Re-anchor')
  app.targets.get('details').click()
  assert.equal(app.window.__prototypeOrphans.length, 1)
  const exported = await app.exportOperations()
  const reanchor = exported.operations.find((operation) => operation.type === 'reanchor')
  assert.equal(reanchor.threadId, base.threadId)
  assert.deepEqual(reanchor.payload, { screen: 'details', anchor: 'div>button', label: 'Action 2' })
  assert.deepEqual(app.committed.operations, [base, missingAnchor])
  const reloaded = boot({ operations: exported.operations })
  reloaded.click('Threads')
  assert.equal(reloaded.window.__prototypeOrphans.length, 1)
  assert.match(reloaded.document.querySelector('.anno-panel').textContent, /Keep feedback missing-screen/)
  assert.equal(reloaded.document.getElementById('details').querySelectorAll('.anno-pin').length, 1)
})

test('deleted threads remain tombstoned when stale creates, replies and reopens are merged', async () => {
  const base = create('deleted')
  const app = boot({ operations: [base] })
  app.click('Threads')
  app.document.querySelector('.anno-thread').click()
  app.click('Delete')
  assert.equal(app.document.querySelectorAll('.anno-thread').length, 0)
  const exported = await app.exportOperations()
  assert.deepEqual(exported.operations.map((operation) => operation.type), ['create', 'delete'])
  assert.doesNotMatch((await app.download('Export Markdown')).content, /Keep feedback/)
  const merged = boot({
    operations: [
      base, ...exported.operations,
      { ...base, id: 'stale-create', at: '2099-01-01T00:00:00.000Z' },
      { id: 'stale-reply', threadId: base.threadId, type: 'reply', at: '2099-01-01T00:00:01.000Z', payload: { message: { ...base.payload.message, id: 'late-message' } } },
      { id: 'stale-reopen', threadId: base.threadId, type: 'set-resolved', at: '2099-01-01T00:00:02.000Z', payload: { resolved: false } },
    ],
    storage: app.storage,
  })
  merged.click('Threads')
  assert.equal(merged.document.querySelectorAll('.anno-thread').length, 0)
  assert.equal((await merged.exportOperations()).operations.filter((operation) => operation.id === base.id).length, 1)
  assert.ok((await merged.exportOperations()).operations.some((operation) => operation.type === 'delete'))
})

test('storage and committed documents stay isolated by prototype identity', async () => {
  const a = create('prototype-a')
  const b = create('prototype-b')
  const storage = new Map([
    [storageKey('design-a'), JSON.stringify({ version: 2, operations: [a] })],
    [storageKey('design-b'), JSON.stringify({ version: 2, operations: [b] })],
  ])
  const app = boot({ prototypeId: 'design-a', committedId: 'design-b', operations: [b], storage })
  app.click('Threads')
  const exported = await app.exportOperations()
  assert.equal(exported.prototypeId, 'design-a')
  assert.deepEqual(exported.operations, [a])
  app.input('Your name for review comments', 'Alex')
  assert.deepEqual(JSON.parse(storage.get(storageKey('design-b'))).operations, [b])
  const other = boot({ prototypeId: 'design-b', storage })
  assert.deepEqual((await other.exportOperations()).operations, [b])
})

test('invalid local documents do not prevent opening the prototype or exporting valid committed feedback', async () => {
  const base = create('committed')
  for (const raw of ['null', '{broken', JSON.stringify({ version: 1, operations: [create('old')] }), JSON.stringify({ version: 2, prototypeId: 'another-prototype', operations: [create('foreign')] })]) {
    const app = boot({ operations: [base], storage: new Map([[storageKey('booking-design'), raw]]) })
    app.click('Threads')
    assert.deepEqual((await app.exportOperations()).operations, [base])
  }
})

test('malformed imported operations are ignored without hiding valid feedback', async () => {
  const base = create('valid')
  const malformed = [
    { ...create('numeric-time'), at: 42 },
    { ...create('missing-text'), payload: { ...create('missing-text').payload, message: { id: 'message', author: 'Reviewer', at: 'now' } } },
    { id: 'bad-resolve', type: 'set-resolved', threadId: base.threadId, at: 'now', payload: { resolved: 'false' } },
    { id: 'bad-anchor', type: 'reanchor', threadId: base.threadId, at: 'now', payload: { screen: {}, anchor: 'div', label: 'Target' } },
    { id: 'unknown', type: 'replace-all', threadId: base.threadId, at: 'now', payload: {} },
  ]
  const storage = new Map([[storageKey('booking-design'), JSON.stringify({ version: 2, operations: malformed })]])
  const app = boot({ operations: [base, ...malformed], storage })
  app.click('Threads')
  assert.equal(app.document.querySelectorAll('.anno-thread').length, 1)
  assert.match((await app.download('Export Markdown')).content, /Keep feedback valid/)
  assert.deepEqual((await app.exportOperations()).operations, [base])
})

test('deletion dominates creation and replies despite reviewer clock skew', async () => {
  const base = create('clock-skew', 'overview', 'div>button', '2026-01-01T12:00:00.000Z')
  const deletion = { id: 'delete-slower-clock', type: 'delete', threadId: base.threadId, at: '2026-01-01T11:59:00.000Z', payload: {} }
  const app = boot({ operations: [base, deletion] })
  app.click('Threads')
  assert.equal(app.document.querySelectorAll('.anno-thread').length, 0)
  assert.equal((await app.exportOperations()).operations.length, 2)
  assert.doesNotMatch((await app.download('Export Markdown')).content, /Keep feedback/)
})

test('replies from a slower clock survive reconstruction after their create', async () => {
  const base = create('clock-reply', 'overview', 'div>button', '2026-01-01T12:00:00.000Z')
  const reply = { id: 'reply-slower-clock', type: 'reply', threadId: base.threadId, at: '2026-01-01T11:59:00.000Z', payload: { message: { id: 'reply-message', text: 'Preserve this earlier-clock reply', author: 'Reviewer', at: '2026-01-01T11:59:00.000Z' } } }
  const app = boot({ operations: [base, reply] })
  assert.match((await app.download('Export Markdown')).content, /Preserve this earlier-clock reply/)
})

test('screen links change the current screen in presentation mode', () => {
  const app = boot()
  app.click('Presentation')
  app.document.querySelectorAll('.screen-nav a')[1].click()
  assert.equal(app.document.querySelector('.screen.is-current').id, 'details')
  app.click('← Back')
  assert.equal(app.document.querySelector('.screen.is-current').id, 'overview')
})

test('click-through maintains back navigation before entering presentation', () => {
  const app = boot()
  app.targets.get('overview').setAttribute('data-goto', 'details')
  app.targets.get('overview').click()
  assert.equal(app.document.querySelector('.proto-back').disabled, false)
  assert.equal(app.document.querySelector('.screen.is-current').id, 'details')
  app.click('← Back')
  assert.equal(app.document.querySelector('.screen.is-current').id, 'overview')
  assert.equal(app.document.querySelector('.proto-back').disabled, true)
})
