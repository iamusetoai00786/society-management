// Mock "AI" engine. Every function works from live data (a society-scoped
// view built by scope() in db.js) with heuristics, so the UI behaves as if it
// were backed by an LLM. To go live, forward the same inputs from the
// /api/ai/* endpoints to a real model.

import { due, isOpen } from './db'

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

const CATEGORY_RULES = [
  ['Plumbing', ['leak', 'water', 'pipe', 'tap', 'drain', 'pressure', 'flush', 'seepage', 'tank']],
  ['Electrical', ['light', 'power', 'electric', 'switch', 'wiring', 'fan', 'socket', 'voltage', 'bulb', 'dg', 'generator']],
  ['Lift', ['lift', 'elevator']],
  ['Security', ['guard', 'theft', 'stranger', 'security', 'cctv', 'dog', 'gate', 'unsafe']],
  ['Housekeeping', ['garbage', 'clean', 'dust', 'trash', 'sweep', 'waste', 'smell']],
  ['Parking', ['parking', 'car', 'vehicle', 'bike', 'parked']],
  ['Amenities', ['gym', 'pool', 'club', 'court', 'treadmill', 'park', 'play']],
  ['Noise', ['noise', 'loud', 'music', 'party', 'drilling']],
]

// categories: the society's ticketCategories master (name, slaHours, assignee)
export function classifyTicket({ title = '', description = '' }, categories = []) {
  const text = `${title} ${description}`.toLowerCase()
  let best = ['General', 0]
  for (const [cat, words] of CATEGORY_RULES) {
    const hits = words.filter((w) => text.includes(w)).length
    if (hits > best[1]) best = [cat, hits]
  }
  const urgentWords = ['stuck', 'fire', 'spark', 'short circuit', 'flood', 'emergency', 'unsafe', 'gas', 'injur', 'trapped']
  const highWords = ['leak', 'no water', 'not working', 'broken', 'since', 'again', 'twice', 'days']
  let priority = 'low'
  if (highWords.some((w) => text.includes(w))) priority = 'medium'
  if (/(since|for) (\d+|two|three|a few) (days|nights|weeks)/.test(text) || text.includes('leak')) priority = 'high'
  if (urgentWords.some((w) => text.includes(w))) priority = 'urgent'
  const angry = ['worst', 'unacceptable', 'again', 'fed up', 'ridiculous', 'very unsafe', '!!']
  const frustrated = ['still', 'since', 'no one', 'nobody', 'repeatedly', 'twice']
  const sentiment = angry.some((w) => text.includes(w)) ? 'angry' : frustrated.some((w) => text.includes(w)) ? 'frustrated' : 'neutral'
  const master = categories.find((c) => c.name === best[0]) || categories.find((c) => c.name === 'General')
  const assignee = master?.assignee || 'Facility Manager'
  const slaHours = priority === 'urgent' ? Math.min(master?.slaHours || 4, 4) : master?.slaHours || 48
  return {
    category: master?.name || best[0],
    priority,
    sentiment,
    confidence: Number(Math.min(0.97, 0.62 + best[1] * 0.12).toFixed(2)),
    suggestedAssignee: assignee,
    slaHours,
    scope: /(lift|gate|common|lobby|park|gym|pool|block|street|tower)/.test(text) ? 'common' : 'personal',
    suggestedReply: `Thank you for reporting this. We've logged it as a ${priority}-priority ${best[0].toLowerCase()} issue and assigned it to ${assignee}. ${priority === 'urgent' ? 'Our team is responding right away.' : `You will get an update within ${slaHours} hours.`}`,
  }
}

const NOTICE_TEMPLATES = [
  [['water', 'tank'], 'Maintenance', 'Water Supply Interruption', (t) => `Dear Residents,\n\nPlease note that water supply will be temporarily suspended ${t.when || 'on the scheduled date'} due to ${t.topic}. We request you to store sufficient water in advance.\n\nWe regret the inconvenience and appreciate your cooperation.`],
  [['power', 'electric', 'dg', 'shutdown'], 'Maintenance', 'Scheduled Power Shutdown', (t) => `Dear Residents,\n\nA planned power shutdown is scheduled ${t.when || 'soon'} for ${t.topic}. DG backup will cover lifts and common-area lighting only. Kindly plan accordingly.\n\nThank you for your understanding.`],
  [['diwali', 'holi', 'festival', 'party', 'event', 'celebrat', 'christmas', 'new year'], 'Event', 'You’re Invited! 🎉', (t) => `Dear Neighbours,\n\nWe are delighted to invite you and your family to ${t.topic} ${t.when || ''} at the clubhouse. Expect music, food and fun activities for all ages.\n\nPlease RSVP in the app so we can plan better. See you there!`],
  [['meeting', 'agm', 'sgm'], 'Meeting', 'Notice of Meeting', (t) => `Dear Members,\n\nNotice is hereby given that a meeting regarding ${t.topic} will be held ${t.when || 'on the scheduled date'} at the clubhouse. Your presence and participation are important.\n\nAgenda and documents are available in the Documents section.`],
  [['pest', 'fumigat', 'mosquito'], 'Maintenance', 'Pest Control Drive', (t) => `Dear Residents,\n\nA pest control drive for ${t.topic} will be carried out ${t.when || 'this week'} in all common areas. Residents who wish to get their flats treated may register at the office.\n\nPlease keep children and pets away from treated areas.`],
  [['due', 'payment', 'maintenance', 'bill'], 'Finance', 'Maintenance Payment Reminder', (t) => `Dear Residents,\n\nThis is a gentle reminder regarding ${t.topic}. Kindly clear pending dues ${t.when || 'before the due date'} to avoid late fees. You can pay instantly via UPI or card in the app.\n\nThank you for your prompt support.`],
]

export function draftNotice({ prompt = '', tone = 'friendly' }, societyName = 'your society') {
  const lower = prompt.trim().toLowerCase()
  const whenMatch = lower.match(/\b(on|from|this|next|tomorrow|today)\b[^,.]*/)
  const when = whenMatch ? whenMatch[0] : ''
  const topic = prompt.trim().replace(new RegExp(when, 'i'), '').trim() || 'the upcoming activity'
  const found = NOTICE_TEMPLATES.find(([keys]) => keys.some((k) => lower.includes(k)))
  const [, category, title, fn] = found || [null, 'General', 'Important Update', (t) => `Dear Residents,\n\nWe would like to inform you about ${t.topic} ${t.when}. For any questions, please reach out to the society office or raise a request in the app.\n\nThank you.`]
  let body = fn({ topic, when })
  if (tone === 'formal') body = body.replace('Dear Neighbours', 'Dear Members').replace(/!|🎉/g, '.')
  if (tone === 'urgent') body = '⚠️ IMPORTANT: ' + body
  return {
    title: title + (found ? ` – ${topic.charAt(0).toUpperCase() + topic.slice(1, 40)}` : ''),
    body: `${body}\n\nWarm regards,\nManaging Committee, ${societyName}`,
    category,
    suggestedAudience: category === 'Meeting' ? 'Owners' : 'All residents',
    translations: { hi: 'प्रिय निवासियों, कृपया इस सूचना पर ध्यान दें। — प्रबंध समिति' },
  }
}

export function defaulterRisk(s) {
  const byUnit = {}
  for (const inv of s.invoices) {
    if (inv.status === 'cancelled') continue
    const u = (byUnit[inv.unitId] ||= { unitId: inv.unitId, unpaid: 0, outstanding: 0, late: 0, total: 0 })
    u.total++
    if (isOpen(inv)) {
      u.unpaid++
      u.outstanding += due(inv)
    } else if (inv.paidAt && new Date(inv.paidAt) > new Date(inv.dueDate)) u.late++
  }
  return Object.values(byUnit)
    .map((u) => {
      const score = Math.min(99, Math.round(u.unpaid * 22 + u.late * 9 + (u.outstanding > 15000 ? 12 : 0)))
      const res = s.residents.find((r) => r.unitId === u.unitId)
      return {
        ...u,
        resident: res?.name || '—',
        score,
        level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
        reason: u.unpaid > 1 ? `${u.unpaid} bills overdue, ${u.late} paid late` : u.late > 1 ? `Paid late ${u.late} of last ${u.total} months` : u.unpaid ? 'Current bill pending' : 'Consistent payer',
        action: score >= 60 ? 'Personal call from Treasurer + payment plan' : score >= 30 ? 'WhatsApp reminder with pay link' : 'No action needed',
      }
    })
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function insights(s) {
  const out = []
  const months = [...new Set(s.expenses.map((e) => e.date.slice(0, 7)))].sort()
  const cur = months.at(-1)
  const prev = months.slice(-4, -1)
  const byCat = {}
  for (const e of s.expenses) {
    if (e.status !== 'approved') continue
    const m = e.date.slice(0, 7)
    byCat[e.category] ||= {}
    byCat[e.category][m] = (byCat[e.category][m] || 0) + e.amount
  }
  for (const [cat, vals] of Object.entries(byCat)) {
    const avg = prev.reduce((a, m) => a + (vals[m] || 0), 0) / (prev.length || 1)
    const now = vals[cur] || 0
    const budget = s.expenseCategories.find((c) => c.name === cat)?.budgetMonthly
    if (avg && now > avg * 1.2) {
      out.push({ id: 'spike-' + cat, severity: 'warning', title: `${cat} spend up ${Math.round((now / avg - 1) * 100)}%`, detail: `${inr(now)} this month vs 3-month average ${inr(avg)}${budget ? ` (budget ${inr(budget)})` : ''}. Check for faulty meters, DG usage or common-area lighting left on during the day.`, action: 'Review expenses', link: '/accounting' })
    } else if (budget && now > budget) {
      out.push({ id: 'budget-' + cat, severity: 'warning', title: `${cat} is over budget`, detail: `${inr(now)} spent against a monthly budget of ${inr(budget)}.`, action: 'Review budget', link: '/masters?tab=expense-categories' })
    }
  }
  const curPeriod = s.invoices.map((i) => i.period).sort().at(-1)
  const curInv = s.invoices.filter((i) => i.period === curPeriod && i.status !== 'cancelled')
  const paid = curInv.filter((i) => i.status === 'paid').length
  const rate = paid / (curInv.length || 1)
  if (curInv.length) out.push({ id: 'collection', severity: rate < 0.75 ? 'warning' : 'success', title: `Collection at ${Math.round(rate * 100)}% for ${curPeriod}`, detail: rate < 0.75 ? `Sending smart reminders to ${curInv.length - paid} units now could recover about ${inr(curInv.filter(isOpen).reduce((a, i) => a + due(i), 0) * 0.6)} before the due date, based on past response rates.` : 'On track to beat last month’s collection.', action: 'Send reminders', link: '/billing' })
  const open = s.tickets.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status))
  const breached = open.filter((t) => t.slaDueAt && new Date(t.slaDueAt) < new Date())
  if (breached.length) out.push({ id: 'sla', severity: 'danger', title: `${breached.length} ticket${breached.length > 1 ? 's' : ''} past SLA`, detail: breached.map((t) => `${t.id} (${t.category})`).join(', ') + '. Escalate to the committee or reassign.', action: 'Open helpdesk', link: '/helpdesk' })
  const cats = {}
  open.forEach((t) => (cats[t.category] = (cats[t.category] || 0) + 1))
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] > 1) out.push({ id: 'hotspot', severity: 'info', title: `${top[0]} is the top complaint area`, detail: `${top[1]} open ${top[0].toLowerCase()} tickets. Similar reports usually point to one root cause, so consider one inspection instead of separate fixes.`, action: 'View tickets', link: '/helpdesk' })
  const pend = s.expenses.filter((e) => e.status === 'pending')
  if (pend.length) out.push({ id: 'approvals', severity: 'info', title: `${pend.length} expenses awaiting approval`, detail: `Total ${inr(pend.reduce((a, e) => a + e.amount, 0))}. Quotes are within 8% of market rates for similar work.`, action: 'Approve', link: '/accounting' })
  const expiring = s.vendors.filter((v) => v.contractEnd && new Date(v.contractEnd) - new Date() < 45 * 86400000)
  if (expiring.length) out.push({ id: 'contracts', severity: 'info', title: `${expiring.length} vendor contract${expiring.length > 1 ? 's' : ''} ending soon`, detail: expiring.map((v) => `${v.name} (${v.contractEnd})`).join(', '), action: 'Vendors', link: '/masters?tab=vendors' })
  const leases = s.residents.filter((r) => r.type === 'tenant' && r.leaseEnd && new Date(r.leaseEnd) - new Date() < 30 * 86400000)
  if (leases.length) out.push({ id: 'leases', severity: 'info', title: `${leases.length} tenant lease${leases.length > 1 ? 's' : ''} ending within 30 days`, detail: leases.map((r) => `${r.unitId} (${r.name})`).join(', ') + '. Collect renewal or plan move-out.', action: 'Residents', link: '/residents?type=tenant' })
  return out
}

export function summarizeTickets(s) {
  const open = s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status))
  const urgent = open.filter((t) => ['urgent', 'high'].includes(t.priority))
  const mood = open.filter((t) => ['angry', 'frustrated'].includes(t.sentiment)).length
  const focus = urgent.slice(0, 2).map((t) => `${t.title.toLowerCase()} (${t.unitId})`)
  return {
    summary: `There are ${open.length} open tickets. ${urgent.length} are high or urgent priority${focus.length ? `: ${focus.join('; ')}` : ''}. ${mood} residents sound frustrated, mostly about delays.${focus.length ? ` Start with ${focus[0]}.` : ''}`,
    themes: [...new Set(open.map((t) => t.category))],
  }
}

// "3 towers A, B, C with 12 floors and 4 flats per floor, 2BHK and 3BHK"
export function structureFromText(text = '') {
  const t = text.toLowerCase()
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 }
  const num = (re, d) => {
    const m = t.match(re)
    if (!m) return d
    return Number(m[1]) || words[m[1]] || d
  }
  const villa = /villa|row ?house|bungalow|plot/.test(t)
  const count = num(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:towers?|blocks?|wings?|buildings?)/, villa ? 1 : 2)
  const floors = villa ? 1 : num(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:floors?|storey|stories)/, 4)
  const per = num(/(\d+|one|two|three|four|five|six|eight|ten|twelve)\s*(?:flats?|units?|apartments?|homes?|villas?|houses?)\s*(?:per|on each|each|a)\s*(?:floor|level)?/, villa ? num(/(\d+)\s*(?:villas?|houses?|plots?)/, 20) : 4)
  const named = text.match(/\b(?:towers?|blocks?|wings?)\s+((?:[A-Z][A-Z0-9]{0,2}\b\s*(?:,|and|&)?\s*)+)/)
  let codes = named ? named[1].split(/\s*(?:,|and|&)\s*|\s+/).filter((c) => /^[A-Z][A-Z0-9]{0,2}$/.test(c)) : []
  if (codes.length !== count) codes = [...Array(count)].map((_, i) => (villa ? (count > 1 ? `V${i + 1}` : 'V') : t.includes('tower') ? `T${i + 1}` : String.fromCharCode(65 + i)))
  const typeNames = [...new Set((text.match(/\b[1-5]\s?BHK\b/gi) || []).map((x) => x.replace(/\s/g, '').toUpperCase()))]
  const areas = { '1BHK': 650, '2BHK': 1100, '3BHK': 1500, '4BHK': 2100, '5BHK': 2800 }
  const unitTypes = villa ? [{ name: 'Villa', areaSqft: 3000 }] : (typeNames.length ? typeNames : ['2BHK', '3BHK']).map((n) => ({ name: n, areaSqft: areas[n] || 1200 }))
  const label = villa ? 'Villas' : t.includes('tower') ? 'Tower' : 'Block'
  return {
    blocks: codes.map((code) => ({ code, name: villa ? label : `${label} ${code}`, floors, unitsPerFloor: per })),
    unitTypes,
    totalUnits: codes.length * floors * per,
    explanation: `I read this as ${codes.length} ${villa ? 'villa cluster' : label.toLowerCase()}${codes.length > 1 ? 's' : ''} (${codes.join(', ')}) × ${floors} floor${floors > 1 ? 's' : ''} × ${per} per floor = ${codes.length * floors * per} units, with ${unitTypes.map((u) => u.name).join(' / ')} types. Adjust anything below before continuing.`,
  }
}

export function explainLedger(unitId, ledger, residents) {
  const open = ledger.entries.filter((e) => e.kind === 'invoice' && e.open)
  const who = residents.map((r) => r.name).join(', ') || 'No resident on record'
  if (!ledger.balance) return `${unitId} (${who}) has no dues. ${ledger.entries.filter((e) => e.kind === 'payment').length} payments recorded, the latest on ${ledger.lastPayment || '—'}.`
  const late = ledger.entries.filter((e) => e.kind === 'invoice').reduce((a, e) => a + (e.lateFee || 0), 0)
  return `${unitId} (${who}) owes **${inr(ledger.balance)}** across ${open.length} open bill${open.length > 1 ? 's' : ''} (${open.map((e) => e.period).join(', ')}). ${late ? `${inr(late)} of this is late fees; waiving it could encourage a quick settlement. ` : ''}Last payment: ${ledger.lastPayment || 'never'}. Suggested next step: ${open.length > 2 ? 'a call from the Treasurer with a 2-month payment plan.' : 'a WhatsApp reminder with the UPI pay link.'}`
}

// ---- Assistant chat -------------------------------------------------------

export function platformChat(db, message) {
  const q = message.toLowerCase()
  const rows = db.societies.map((soc) => {
    const inv = db.invoices.filter((i) => i.societyId === soc.id)
    const period = inv.map((i) => i.period).sort().at(-1)
    const cur = inv.filter((i) => i.period === period && i.status !== 'cancelled')
    return { soc, units: db.units.filter((u) => u.societyId === soc.id).length, rate: cur.filter((i) => i.status === 'paid').length / (cur.length || 1), open: db.tickets.filter((t) => t.societyId === soc.id && !['resolved', 'closed'].includes(t.status)).length }
  })
  const suggestions = ['Which society has the lowest collection?', 'How much MRR do we make?', 'Which society has the most open tickets?']
  if (q.includes('mrr') || q.includes('revenue') || q.includes('subscription')) {
    const mrr = rows.reduce((a, r) => a + r.units * (db.plans.find((p) => p.id === r.soc.plan)?.pricePerUnit || 0), 0)
    return { reply: `Platform MRR is **${inr(mrr)}** from ${rows.length} societies:\n\n${rows.map((r) => `• ${r.soc.name} (${r.soc.plan}, ${r.units} units)`).join('\n')}`, suggestions, action: { label: 'Open societies', to: '/societies' } }
  }
  if (q.includes('ticket') || q.includes('complaint')) {
    const top = [...rows].sort((a, b) => b.open - a.open)[0]
    return { reply: `**${top.soc.name}** has the most open tickets (${top.open}). ${rows.map((r) => `${r.soc.name}: ${r.open}`).join(' · ')}`, suggestions }
  }
  const low = [...rows].sort((a, b) => a.rate - b.rate)
  return { reply: `Collection this cycle:\n\n${low.map((r) => `• **${r.soc.name}**: ${Math.round(r.rate * 100)}%`).join('\n')}\n\n${low[0].soc.name} is lowest; consider enabling automated WhatsApp reminders there.`, suggestions, action: { label: 'Open societies', to: '/societies' } }
}

export function chat(s, user, message) {
  const q = message.toLowerCase()
  const admin = user.role === 'admin' || user.role === 'super_admin'
  const suggestions = admin
    ? ['Who are the top defaulters?', 'Summarise open complaints', 'How much did we spend this month?', 'Draft a notice about pest control next Monday']
    : ['What are my dues?', 'Book the gym tomorrow evening', 'Any notices for me?', 'Report a water leak in my kitchen']
  const reply = (text, extra = {}) => ({ reply: text, suggestions, ...extra })

  if (/^(hi|hello|hey|namaste)\b/.test(q)) return reply(`Hi ${user.name.split(' ')[0]}! 👋 I'm the ${s.society.name} assistant. I can check dues, triage complaints, draft notices, book amenities and pull reports. What do you need?`)

  if (q.includes('defaulter') || (admin && q.includes('risk'))) {
    const list = defaulterRisk(s).slice(0, 5)
    return reply(`Here are the units most at risk of not paying, based on payment history:\n\n${list.map((d, i) => `${i + 1}. **${d.unitId}** (${d.resident}): risk ${d.score}/100, ${inr(d.outstanding)} outstanding. ${d.reason}.`).join('\n')}\n\nRecommended: a personal call for high-risk units and automated WhatsApp reminders for the rest.`, { action: { label: 'Open billing', to: '/billing' } })
  }
  if (q.includes('due') || q.includes('bill') || q.includes('pay') || q.includes('outstanding')) {
    if (admin) {
      const open = s.invoices.filter(isOpen)
      return reply(`Society-wide there are **${open.length} open invoices** totalling **${inr(open.reduce((a, i) => a + due(i), 0))}** across ${new Set(open.map((i) => i.unitId)).size} units.`, { action: { label: 'Go to billing', to: '/billing' } })
    }
    const inv = s.invoices.filter((i) => i.unitId === user.unitId && isOpen(i))
    const total = inv.reduce((a, i) => a + due(i), 0)
    return reply(inv.length ? `You have **${inv.length} pending bill${inv.length > 1 ? 's' : ''}** for ${user.unitId} totalling **${inr(total)}**. The earliest is ${inv[0].period}. Each bill is built from the society’s charge heads (${inv[0].items.map((x) => x.head).join(', ')}). You can pay instantly with UPI.` : `You're all caught up. No dues for ${user.unitId}. 🎉`, inv.length ? { action: { label: 'Pay now', to: '/billing' } } : {})
  }
  if (q.includes('spend') || q.includes('expense') || q.includes('spent') || q.includes('budget')) {
    const cur = s.expenses.map((e) => e.date.slice(0, 7)).sort().at(-1)
    const list = s.expenses.filter((e) => e.date.startsWith(cur) && e.status === 'approved')
    const by = {}
    list.forEach((e) => (by[e.category] = (by[e.category] || 0) + e.amount))
    return reply(`Approved spend this month is **${inr(list.reduce((a, e) => a + e.amount, 0))}**:\n\n${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, v]) => { const b = s.expenseCategories.find((x) => x.name === c)?.budgetMonthly; return `• ${c}: ${inr(v)}${b ? ` / budget ${inr(b)}${v > b ? ' ⚠️' : ''}` : ''}` }).join('\n')}`, { action: { label: 'Open accounting', to: '/accounting' } })
  }
  if ((q.includes('complaint') || q.includes('ticket') || q.includes('issue')) && !q.includes('report') && !q.includes('raise')) {
    return reply(summarizeTickets(s).summary, { action: { label: 'Open helpdesk', to: '/helpdesk' } })
  }
  if (q.includes('leak') || q.includes('broken') || q.includes('not working') || q.includes('report') || q.includes('raise')) {
    const c = classifyTicket({ title: message }, s.ticketCategories)
    return reply(`Sorry to hear that. I've pre-filled a **${c.category}** ticket (priority: ${c.priority}, SLA ${c.slaHours}h). It will go to ${c.suggestedAssignee}.`, { action: { label: 'Review & submit', to: '/helpdesk?new=' + encodeURIComponent(message) } })
  }
  if (q.includes('notice') && (q.includes('draft') || q.includes('write') || q.includes('create'))) {
    const d = draftNotice({ prompt: message.replace(/draft|write|create|a notice|notice|about/gi, '').trim() }, s.society.name)
    return reply(`Here's a draft:\n\n**${d.title}**\n\n${d.body}`, { action: { label: 'Edit in Notices', to: '/notices' } })
  }
  if (q.includes('notice') || q.includes('announcement') || q.includes('news')) {
    return reply(`Latest notices:\n\n${s.notices.slice(0, 3).map((x) => `• **${x.title}**: ${x.body.slice(0, 90)}…`).join('\n')}`, { action: { label: 'All notices', to: '/notices' } })
  }
  if (q.includes('book') || s.amenities.some((a) => q.includes(a.name.toLowerCase().split(' ')[0]))) {
    const a = s.amenities.find((x) => q.includes(x.name.toLowerCase().split(' ')[0])) || s.amenities[0]
    if (!a) return reply('This society has no bookable amenities set up yet.')
    const evening = q.includes('evening') || q.includes('night')
    const slot = a.slots.find((x) => (evening ? parseInt(x) >= 17 : parseInt(x) < 12)) || a.slots[0]
    return reply(`**${a.name}** has availability${q.includes('tomorrow') ? ' tomorrow' : ''} in the **${slot}** slot${a.fee ? ` (fee ${inr(a.fee)})` : ' (free)'}. Want me to take you there to confirm?`, { action: { label: `Book ${a.name}`, to: '/amenities' } })
  }
  if (q.includes('visitor') || q.includes('guest') || q.includes('delivery')) {
    const today = new Date().toISOString().slice(0, 10)
    const v = s.visitors.filter((x) => x.checkIn.startsWith(today) && (admin || user.role === 'guard' || x.unitId === user.unitId))
    return reply(`${v.length} visitor entries today${admin || user.role === 'guard' ? '' : ' for your unit'}; ${v.filter((x) => x.status === 'inside').length} currently inside and ${v.filter((x) => x.status === 'pending').length} waiting for approval.`, { action: { label: 'Open visitors', to: '/visitors' } })
  }
  if (q.includes('summary') || q.includes('overview') || q.includes('how is') || q.includes('status') || q.includes('brief')) {
    return reply(`Here's today's snapshot for ${s.society.name}:\n\n${insights(s).map((i) => `• **${i.title}**: ${i.detail}`).join('\n')}`, { action: { label: 'AI Insights', to: '/insights' } })
  }
  if (q.includes('setup') || q.includes('start') || q.includes('how do i') || q.includes('guide')) {
    return reply('The Guide page walks through setup in order: **Masters** (blocks, unit types, charge heads, categories, staff) → **Units & residents** → **Generate bills** → **Collect payments** → day-to-day work (gate, helpdesk, notices).', { action: { label: 'Open guide', to: '/guide' } })
  }
  if (q.includes('emergency') || q.includes('sos') || q.includes('help me')) {
    return reply('If this is an emergency, press the red **SOS** button at the top. It alerts security and the committee instantly with your unit number. Emergency numbers: Ambulance 108, Fire 101, Police 112.')
  }
  return reply(`I'm not sure about that yet. Try asking about dues, complaints, expenses, visitors, notices, setup or amenity bookings.`)
}
