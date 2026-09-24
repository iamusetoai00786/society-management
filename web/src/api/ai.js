// Mock "AI" engine. Every function works from the live mock database with
// heuristics so the UI behaves like it is backed by an LLM. To go live, the
// /api/ai/* endpoints can forward the same inputs to a real model.

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
const ASSIGNEES = {
  Plumbing: 'Suresh (Plumber)', Electrical: 'Mahesh (Electrician)', Lift: 'Otis AMC Team', Security: 'Ram Singh (Security)',
  Housekeeping: 'CleanPro Team', Parking: 'Ram Singh (Security)', Amenities: 'Facility Manager', Noise: 'Committee', General: 'Facility Manager',
}

export function classifyTicket({ title = '', description = '' }) {
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
  const confidence = Math.min(0.97, 0.62 + best[1] * 0.12)
  const cat = best[0]
  return {
    category: cat,
    priority,
    sentiment,
    confidence: Number(confidence.toFixed(2)),
    suggestedAssignee: ASSIGNEES[cat],
    scope: /(lift|gate|common|lobby|park|gym|pool|block|street)/.test(text) ? 'common' : 'personal',
    suggestedReply: `Thank you for reporting this. We've logged it as a ${priority}-priority ${cat.toLowerCase()} issue and assigned it to ${ASSIGNEES[cat]}. ${priority === 'urgent' ? 'Our team is responding right away.' : 'You will get an update within ' + (priority === 'high' ? '24' : '48') + ' hours.'}`,
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

export function draftNotice({ prompt = '', tone = 'friendly' }) {
  const p = prompt.trim()
  const lower = p.toLowerCase()
  const whenMatch = lower.match(/\b(on|from|this|next|tomorrow|today)\b[^,.]*/)
  const when = whenMatch ? whenMatch[0] : ''
  const topic = p.replace(new RegExp(when, 'i'), '').trim() || 'the upcoming activity'
  let found = NOTICE_TEMPLATES.find(([keys]) => keys.some((k) => lower.includes(k)))
  const [, category, title, fn] = found || [null, 'General', 'Important Update', (t) => `Dear Residents,\n\nWe would like to inform you about ${t.topic} ${t.when}. For any questions, please reach out to the society office or raise a request in the app.\n\nThank you.`]
  let body = fn({ topic, when })
  if (tone === 'formal') body = body.replace('Dear Neighbours', 'Dear Members').replace(/!|🎉/g, '.')
  if (tone === 'urgent') body = '⚠️ IMPORTANT: ' + body
  const sign = '\n\nWarm regards,\nManaging Committee, Green Valley Residency'
  return {
    title: title + (topic && found ? ` – ${topic.charAt(0).toUpperCase() + topic.slice(1, 40)}` : ''),
    body: body + sign,
    category,
    suggestedAudience: category === 'Meeting' ? 'Owners' : 'All residents',
    translations: {
      hi: 'प्रिय निवासियों, कृपया इस सूचना पर ध्यान दें। — प्रबंध समिति',
    },
  }
}

export function defaulterRisk(db) {
  const byUnit = {}
  for (const inv of db.invoices) {
    const u = (byUnit[inv.unitId] ||= { unitId: inv.unitId, unpaid: 0, outstanding: 0, late: 0, total: 0 })
    u.total++
    if (inv.status === 'unpaid') {
      u.unpaid++
      u.outstanding += inv.amount + inv.lateFee
    } else if (inv.paidAt && new Date(inv.paidAt) > new Date(inv.dueDate)) u.late++
  }
  return Object.values(byUnit)
    .map((u) => {
      const score = Math.min(99, Math.round(u.unpaid * 22 + u.late * 9 + (u.outstanding > 15000 ? 12 : 0)))
      const res = db.residents.find((r) => r.unitId === u.unitId)
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

export function insights(db) {
  const out = []
  const months = [...new Set(db.expenses.map((e) => e.date.slice(0, 7)))].sort()
  const cur = months.at(-1)
  const prev = months.slice(-4, -1)
  const byCat = {}
  for (const e of db.expenses) {
    if (e.status !== 'approved') continue
    const m = e.date.slice(0, 7)
    byCat[e.category] ||= {}
    byCat[e.category][m] = (byCat[e.category][m] || 0) + e.amount
  }
  for (const [cat, vals] of Object.entries(byCat)) {
    const avg = prev.reduce((s, m) => s + (vals[m] || 0), 0) / (prev.length || 1)
    const now = vals[cur] || 0
    if (avg && now > avg * 1.2) {
      out.push({ id: 'spike-' + cat, severity: 'warning', title: `${cat} spend up ${Math.round((now / avg - 1) * 100)}%`, detail: `${inr(now)} this month vs 3-month average ${inr(avg)}. Check for faulty meters, DG usage or common-area lighting left on during the day.`, action: 'Review expenses', link: '/accounting' })
    }
  }
  const curPeriod = db.invoices.map((i) => i.period).sort().at(-1)
  const curInv = db.invoices.filter((i) => i.period === curPeriod)
  const rate = curInv.filter((i) => i.status === 'paid').length / (curInv.length || 1)
  out.push({ id: 'collection', severity: rate < 0.75 ? 'warning' : 'success', title: `Collection at ${Math.round(rate * 100)}% for this cycle`, detail: rate < 0.75 ? `Sending smart reminders to ${curInv.length - curInv.filter((i) => i.status === 'paid').length} units now could recover about ${inr(curInv.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0) * 0.6)} before the due date, based on past response rates.` : 'On track to beat last month’s collection.', action: 'Send reminders', link: '/billing' })
  const open = db.tickets.filter((t) => ['open', 'assigned', 'in_progress'].includes(t.status))
  const cats = {}
  open.forEach((t) => (cats[t.category] = (cats[t.category] || 0) + 1))
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] > 1) out.push({ id: 'hotspot', severity: 'info', title: `${top[0]} is the top complaint area`, detail: `${top[1]} open ${top[0].toLowerCase()} tickets. Similar reports usually point to one root cause, so consider one inspection instead of separate fixes.`, action: 'View tickets', link: '/helpdesk' })
  const urgent = open.filter((t) => t.priority === 'urgent' && !t.assignee)
  if (urgent.length) out.push({ id: 'urgent', severity: 'danger', title: `${urgent.length} urgent ticket unassigned`, detail: urgent.map((t) => `${t.id}: ${t.title}`).join('; '), action: 'Assign now', link: '/helpdesk' })
  const pend = db.expenses.filter((e) => e.status === 'pending')
  if (pend.length) out.push({ id: 'approvals', severity: 'info', title: `${pend.length} expenses awaiting approval`, detail: `Total ${inr(pend.reduce((s, e) => s + e.amount, 0))}. Quotes are within 8% of market rates for similar work.`, action: 'Approve', link: '/accounting' })
  return out
}

export function summarizeTickets(db) {
  const open = db.tickets.filter((t) => !['resolved', 'closed'].includes(t.status))
  const urgent = open.filter((t) => ['urgent', 'high'].includes(t.priority))
  const mood = open.filter((t) => ['angry', 'frustrated'].includes(t.sentiment)).length
  return {
    summary: `There are ${open.length} open tickets. ${urgent.length} are high or urgent priority: ${urgent.map((t) => t.title.toLowerCase()).join('; ')}. ${mood} residents sound frustrated, mostly about delays. Focus on the Block A lift (safety) and plumbing in Block C.`,
    themes: [...new Set(open.map((t) => t.category))],
  }
}

// ---- Assistant chat -------------------------------------------------------

function unitDues(db, unitId) {
  const inv = db.invoices.filter((i) => i.unitId === unitId && i.status === 'unpaid')
  return { count: inv.length, total: inv.reduce((s, i) => s + i.amount + i.lateFee, 0), inv }
}

export function chat(db, user, message) {
  const q = message.toLowerCase()
  const admin = user.role === 'admin'
  const suggestions = admin
    ? ['Who are the top defaulters?', 'Summarise open complaints', 'How much did we spend this month?', 'Draft a notice about pest control next Monday']
    : ['What are my dues?', 'Book the gym tomorrow evening', 'Any notices for me?', 'Report a water leak']
  const reply = (text, extra = {}) => ({ reply: text, suggestions, ...extra })

  if (/^(hi|hello|hey|namaste)\b/.test(q)) return reply(`Hi ${user.name.split(' ')[0]}! 👋 I'm your SocietyOS assistant. I can check dues, triage complaints, draft notices, book amenities and pull reports. What do you need?`)

  if (q.includes('defaulter') || (admin && q.includes('risk'))) {
    const list = defaulterRisk(db).slice(0, 5)
    return reply(`Here are the units most at risk of not paying, based on payment history:\n\n${list.map((d, i) => `${i + 1}. **${d.unitId}** (${d.resident}): risk ${d.score}/100, ${inr(d.outstanding)} outstanding. ${d.reason}.`).join('\n')}\n\nRecommended: a personal call for high-risk units and automated WhatsApp reminders for the rest.`, { action: { label: 'Open billing', to: '/billing' } })
  }

  if (q.includes('due') || q.includes('bill') || q.includes('pay') || q.includes('outstanding')) {
    if (admin) {
      const unpaid = db.invoices.filter((i) => i.status === 'unpaid')
      return reply(`Society-wide there are **${unpaid.length} unpaid invoices** totalling **${inr(unpaid.reduce((s, i) => s + i.amount + i.lateFee, 0))}** across ${new Set(unpaid.map((i) => i.unitId)).size} units.`, { action: { label: 'Go to billing', to: '/billing' } })
    }
    const d = unitDues(db, user.unitId)
    return reply(d.count ? `You have **${d.count} pending bill${d.count > 1 ? 's' : ''}** for ${user.unitId} totalling **${inr(d.total)}**. The earliest is ${d.inv[0].period}. You can pay instantly with UPI.` : `You're all caught up. No dues for ${user.unitId}. 🎉`, d.count ? { action: { label: 'Pay now', to: '/billing' } } : {})
  }

  if (q.includes('spend') || q.includes('expense') || q.includes('spent')) {
    const cur = db.expenses.map((e) => e.date.slice(0, 7)).sort().at(-1)
    const list = db.expenses.filter((e) => e.date.startsWith(cur) && e.status === 'approved')
    const by = {}
    list.forEach((e) => (by[e.category] = (by[e.category] || 0) + e.amount))
    return reply(`Approved spend this month is **${inr(list.reduce((s, e) => s + e.amount, 0))}**:\n\n${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, v]) => `• ${c}: ${inr(v)}`).join('\n')}\n\n⚠️ Electricity is noticeably higher than usual; see Insights.`, { action: { label: 'Open accounting', to: '/accounting' } })
  }

  if (q.includes('complaint') || q.includes('ticket') || q.includes('issue')) {
    if (q.includes('report') || q.includes('raise') || q.includes('leak') && !q.includes('summar')) {
      const c = classifyTicket({ title: message })
      return reply(`I can raise this for you. AI triage suggests **${c.category}**, priority **${c.priority}**, assigned to ${c.suggestedAssignee}. Open the helpdesk to confirm and add photos.`, { action: { label: 'Raise ticket', to: '/helpdesk?new=' + encodeURIComponent(message) } })
    }
    return reply(summarizeTickets(db).summary, { action: { label: 'Open helpdesk', to: '/helpdesk' } })
  }
  if (q.includes('leak') || q.includes('broken') || q.includes('not working') || q.includes('report')) {
    const c = classifyTicket({ title: message })
    return reply(`Sorry to hear that. I've pre-filled a **${c.category}** ticket (priority: ${c.priority}). It will go to ${c.suggestedAssignee}.`, { action: { label: 'Review & submit', to: '/helpdesk?new=' + encodeURIComponent(message) } })
  }

  if (q.includes('notice') && (q.includes('draft') || q.includes('write') || q.includes('create'))) {
    const d = draftNotice({ prompt: message.replace(/draft|write|create|a notice|notice|about/gi, '').trim() })
    return reply(`Here's a draft:\n\n**${d.title}**\n\n${d.body}`, { action: { label: 'Edit in Notices', to: '/notices' } })
  }
  if (q.includes('notice') || q.includes('announcement') || q.includes('news')) {
    const n = db.notices.slice(0, 3)
    return reply(`Latest notices:\n\n${n.map((x) => `• **${x.title}**: ${x.body.slice(0, 90)}…`).join('\n')}`, { action: { label: 'All notices', to: '/notices' } })
  }

  if (q.includes('book') || q.includes('gym') || q.includes('pool') || q.includes('clubhouse') || q.includes('court')) {
    const a = db.amenities.find((x) => q.includes(x.name.toLowerCase().split(' ')[0])) || db.amenities[1]
    const evening = q.includes('evening') || q.includes('night')
    const slot = a.slots.find((s) => (evening ? parseInt(s) >= 17 : parseInt(s) < 12)) || a.slots[0]
    return reply(`**${a.name}** has availability${q.includes('tomorrow') ? ' tomorrow' : ''} in the **${slot}** slot${a.fee ? ` (fee ${inr(a.fee)})` : ' (free)'}. Want me to take you there to confirm?`, { action: { label: `Book ${a.name}`, to: '/amenities' } })
  }

  if (q.includes('visitor') || q.includes('guest') || q.includes('delivery')) {
    const today = new Date().toISOString().slice(0, 10)
    const v = db.visitors.filter((x) => x.checkIn.startsWith(today) && (admin || user.role === 'guard' || x.unitId === user.unitId))
    return reply(`${v.length} visitor entries today${admin ? '' : ' for your unit'}; ${v.filter((x) => x.status === 'inside').length} currently inside and ${v.filter((x) => x.status === 'pending').length} waiting for approval. You can also create a pre-approved gate pass with an OTP.`, { action: { label: 'Open visitors', to: '/visitors' } })
  }

  if (q.includes('summary') || q.includes('overview') || q.includes('how is') || q.includes('status')) {
    const ins = insights(db)
    return reply(`Here's today's snapshot:\n\n${ins.map((i) => `• **${i.title}**: ${i.detail}`).join('\n')}`, { action: { label: 'Dashboard', to: '/' } })
  }

  if (q.includes('emergency') || q.includes('sos') || q.includes('help me')) {
    return reply('If this is an emergency, press the red **SOS** button at the top. It alerts security and the committee instantly with your unit number. Emergency numbers: Ambulance 108, Fire 101, Police 112.')
  }

  return reply(`I'm not sure about that yet. Try asking about dues, complaints, expenses, visitors, notices or amenity bookings.`)
}
