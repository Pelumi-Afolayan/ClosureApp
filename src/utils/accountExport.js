const reflectionLabels = { lesson: "What I've learned", my_part: "What I'd do differently", next_time: 'What I want next time', reality_check: 'The real picture', reason: 'My reasons for no contact', looking_forward: 'Looking forward to' }
function inline(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}[\]()<>#!|]/g, '\\$&')
}
function block(value) {
  const text = String(value ?? '')
  const runs = text.match(/`+/g) || []
  const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)))
  return `${fence}text\n${text}\n${fence}`
}
function fields(row) {
  return Object.entries(row).map(([key, value]) => `- ${inline(key.replaceAll('_', ' '))}: ${inline(Array.isArray(value) ? value.join(', ') : value)}`).join('\n')
}
export function formatAccountExport(data, date, format = 'markdown') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('A valid export date is required.')
  if (!['markdown', 'json'].includes(format)) throw new Error('Choose Markdown or JSON.')
  const contents = { export_version: 1, exported_on: date }
  for (const key of ['profile', 'check_ins', 'journal_entries', 'story', 'reflections', 'app_visits', 'no_contact_days']) contents[key] = data[key]
  if (format === 'json') return { filename: `closure-data-${date}.json`, type: 'application/json;charset=utf-8', text: JSON.stringify(contents, null, 2) }
  const parts = ['# Your Closure data', `Exported on ${date}.`, '## Profile', data.profile ? fields(data.profile) : 'No profile saved.', '## Mood check-ins']
  for (const row of data.check_ins) parts.push(`### ${inline(row.check_in_date)}`, fields({ id: row.id, moods: row.moods, created_at: row.created_at, updated_at: row.updated_at }), block(row.note))
  if (!data.check_ins.length) parts.push('No check-ins saved.')
  parts.push('## Journal entries and unsent letters')
  for (const row of data.journal_entries) parts.push(`### ${inline(row.title || (row.entry_type === 'unsent_letter' ? 'Untitled letter' : 'Untitled entry'))}`, fields({ id: row.id, type: row.entry_type === 'unsent_letter' ? 'Unsent letter' : 'Journal entry', created_at: row.created_at, updated_at: row.updated_at }), block(row.content))
  if (!data.journal_entries.length) parts.push('No writing saved.')
  parts.push('## My story')
  if (data.story) {
    parts.push(fields({ created_at: data.story.created_at, updated_at: data.story.updated_at }))
    for (const [key, label] of [['what_happened', 'What happened?'], ['what_hurt', 'What hurt me?'], ['what_i_need', 'What I need now']]) parts.push(`### ${label}`, block(data.story[key]))
  } else parts.push('No story saved.')
  parts.push('## Reflections')
  for (const row of data.reflections) parts.push(`### ${reflectionLabels[row.kind] || inline(row.kind)}`, fields({ id: row.id, created_at: row.created_at, updated_at: row.updated_at }), block(row.content))
  if (!data.reflections.length) parts.push('No reflections saved.')
  for (const [key, label] of [['app_visits', 'App visit dates'], ['no_contact_days', 'Confirmed no-contact dates']]) {
    parts.push(`## ${label}`)
    parts.push(data[key].length ? data[key].map(row => `- ${inline(row.activity_date)} (recorded ${inline(row.recorded_at)})`).join('\n') : 'No dates saved.')
  }
  return { filename: `closure-data-${date}.md`, type: 'text/markdown;charset=utf-8', text: parts.join('\n\n') + '\n' }
}
