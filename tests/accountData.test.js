import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAccountExport } from '../src/utils/accountExport.js'
import { createAccountDataRequests, finishDeletedSession } from '../src/utils/accountDataRequests.js'
import { createDeleteAccountHandler } from '../supabase/functions/delete-account/handler.js'

const empty = () => ({ profile: null, check_ins: [], journal_entries: [], story: null, reflections: [], app_visits: [], no_contact_days: [] })

test('readable Markdown contains every dataset and protects writing and headings from Markdown injection', () => {
  const data = empty()
  data.profile = { preferred_name: 'Name\n# heading', goals: ['find_peace'], show_celebrations: false }
  data.check_ins = [{ check_in_date: '2026-11-14', moods: ['sad','hopeful'], note: 'Line one\nLine two' }]
  data.journal_entries = [{ id: 'letter', title: '<script>fixture</script>', content: '```\n# heading\n<img src=x>\n```', entry_type: 'unsent_letter' }]
  data.story = { what_happened: 'Story', what_hurt: 'Hurt', what_i_need: 'Rest' }
  data.reflections = ['lesson','my_part','next_time','reality_check','reason'].map(kind => ({ kind, content: `Fixture ${kind}` }))
  data.app_visits = [{ activity_date: '2026-11-14', recorded_at: '2026-11-14T00:00:00Z' }]
  data.no_contact_days = [{ activity_date: '2026-11-13' }]
  const file = formatAccountExport(data, '2026-11-14')
  assert.equal(file.filename, 'closure-data-2026-11-14.md')
  assert.doesNotMatch(file.filename, /Name/)
  for (const text of ['Profile','Mood check-ins','Journal entries and unsent letters','My story','Reflections','App visit dates','Confirmed no-contact dates','Unsent letter','Fixture reality_check','Line one\nLine two']) assert.ok(file.text.includes(text))
  assert.ok(file.text.includes('````text\n```\n# heading\n<img src=x>\n```\n````'))
  assert.ok(file.text.includes('Name \\# heading'))
  assert.match(file.text, /show celebrations: false/)
  assert.ok(file.text.includes('\\<script\\>fixture\\</script\\>'))
})

test('JSON round-trips original whitespace, Unicode and empty optional data without exporting extra top-level secrets', () => {
  const data = empty()
  data.journal_entries = [{ content: ' 🌿\n  unchanged ', entry_type: 'journal' }]
  const file = formatAccountExport({ ...data, access_token: 'never-export' }, '2026-11-14', 'json')
  const parsed = JSON.parse(file.text)
  assert.deepEqual(parsed.journal_entries, data.journal_entries)
  assert.equal(parsed.profile, null)
  assert.equal(parsed.access_token, undefined)
  assert.equal(file.filename, 'closure-data-2026-11-14.json')
  assert.match(formatAccountExport(empty(), '2026-11-14').text, /No writing saved/)
  assert.throws(() => formatAccountExport(data, '../name'), /valid export date/)
})

function fakeClient({ failTable, wrongUser = false, pages = {} } = {}) {
  const calls = []
  const client = {
    auth: {
      async getUser(token) { calls.push(['verify',token]); return { data: { user: { id: wrongUser ? 'other' : 'owner' } }, error: null } },
      async getSession() { return { data: { session: { access_token: 'verified-session', user: { id: wrongUser ? 'other' : 'owner' } } }, error: null } },
    },
    functions: { async invoke(name, options) { calls.push(['invoke',name,options]); return { data: { deleted: true }, error: null } } },
    from(table) {
      calls.push(['from',table]); let offset = 0
      const query = {}
      for (const method of ['select','eq','order','abortSignal']) query[method] = (...args) => { calls.push([method,...args]); return query }
      query.range = (start,end) => { offset=start; calls.push(['range',start,end]); return query }
      query.then = (resolve,reject) => Promise.resolve({ data: pages[table]?.[offset] || [], error: table === failTable ? new Error('fixture failure') : null }).then(resolve,reject)
      return query
    },
  }
  const service = createAccountDataRequests(client, {
    disableReminder: async id => { calls.push(['cleanup',id]) },
    clearSession: async userId => { calls.push(['clear',userId]) },
  })
  return { client, calls, service }
}

test('export paginates past 500/1000 rows and filters every query by owner, with explicit safe fields', async () => {
  const page = Array.from({length:500},(_,id)=>({ id }))
  const {service,calls} = fakeClient({ pages: { journal_entries: { 0:page,500:page,1000:[{id:1001}] } } })
  const data = await service.exportAccountData('owner', new AbortController().signal)
  assert.equal(data.journal_entries.length,1001)
  assert.equal(calls.filter(call=>call[0]==='from').length,9)
  assert.ok(calls.filter(call=>call[0]==='eq').every(call=>call[2]==='owner'))
  assert.ok(calls.filter(call=>call[0]==='select').every(call=>!call[1].includes('*') && !call[1].includes('subscription')))
  assert.equal(calls.filter(call=>call[0]==='abortSignal').length,9)
})

test('failed exports and mismatched identities never return partial or another account data', async () => {
  await assert.rejects(fakeClient({failTable:'journal_entries'}).service.exportAccountData('owner'), /No partial file/)
  const wrong = fakeClient({wrongUser:true})
  await assert.rejects(wrong.service.exportAccountData('owner'), /sign in again/)
  assert.equal(wrong.calls.some(call=>call[0]==='from'),false)
})

test('browser deletion cleans reminders first, sends no user ID, then clears the local session only after success', async () => {
  const {service,calls} = fakeClient()
  await service.deleteAccount({userId:'owner',confirmation:'DELETE',permanent:true})
  assert.ok(calls.findIndex(call=>call[0]==='cleanup') < calls.findIndex(call=>call[0]==='invoke'))
  assert.deepEqual(calls.find(call=>call[0]==='invoke')[2], { headers: { Authorization:'Bearer verified-session' },body:{confirmation:'DELETE',permanent:true} })
  assert.deepEqual(calls.at(-1),['clear','owner'])
})

test('incomplete confirmations, reminder cleanup failures and function errors do not clear sessions', async () => {
  const original = fakeClient()
  for (const options of [{confirmation:'delete',permanent:true},{confirmation:'DELETE',permanent:false}]) await assert.rejects(original.service.deleteAccount({userId:'owner',...options}))
  assert.equal(original.calls.length,0)
  const {client,calls} = fakeClient()
  const cleanupFailure = createAccountDataRequests(client,{disableReminder:async()=>{throw new Error('offline')},clearSession:async()=>calls.push(['clear'])})
  await assert.rejects(cleanupFailure.deleteAccount({userId:'owner',confirmation:'DELETE',permanent:true}), /has not been deleted/)
  assert.equal(calls.some(call=>call[0]==='invoke'),false)
  client.functions.invoke=async()=>({data:null,error:new Error('offline')})
  const requestFailure = createAccountDataRequests(client,{disableReminder:async()=>{},clearSession:async()=>calls.push(['clear'])})
  await assert.rejects(requestFailure.deleteAccount({userId:'owner',confirmation:'DELETE',permanent:true}), /wasn't confirmed/)
  assert.equal(calls.some(call=>call[0]==='clear'),false)
})

test('deleted session cleanup clears only Closure auth keys and still exits if sign-out stalls', async () => {
  const removed=[]; let left
  await finishDeletedSession({auth:{stopAutoRefresh:async()=>{},signOut:()=>new Promise(()=>{})},storage:{removeItem:key=>removed.push(key)},storageKey:'sb-project-auth-token',leave:cleared=>{left=cleared},timeoutMs:5})
  assert.deepEqual(removed,['sb-project-auth-token','sb-project-auth-token-code-verifier','sb-project-auth-token-user','closure.push-device-id'])
  assert.equal(left,true)
  await finishDeletedSession({auth:{stopAutoRefresh:async()=>{},signOut:async()=>{}},storage:{removeItem:()=>{throw new Error('blocked')}},storageKey:'key',leave:cleared=>{left=cleared}})
  assert.equal(left,false)
})

function server({ user = {id:'verified-owner'}, readiness = true, failure = false } = {}) {
  const calls=[]
  const handler=createDeleteAccountHandler({allowedOrigins:['https://closuree.vercel.app'],verifyUser:async token=>{calls.push(['verify',token]);return user},ready:async()=>readiness,deleteUser:async id=>{calls.push(['delete',id]);if(failure)throw new Error('private internal error')}})
  return {calls,handler}
}
function request(body={confirmation:'DELETE',permanent:true}, headers={}) {
  return new Request('https://fixture.supabase.co/functions/v1/delete-account',{method:'POST',headers:{authorization:'Bearer fixture-token','content-type':'application/json',...headers},body:JSON.stringify(body)})
}

test('server deletes only the verified JWT owner and returns no private data',async()=>{
  const {handler,calls}=server()
  const response=await handler(request())
  assert.equal(response.status,200)
  assert.deepEqual(await response.json(),{deleted:true})
  assert.deepEqual(calls.at(-1),['delete','verified-owner'])
  assert.equal(response.headers.get('cache-control'),'no-store')
})

test('server rejects spoofed IDs, missing/invalid identities, incomplete setup and oversized bodies',async()=>{
  for(const body of [{confirmation:'DELETE',permanent:true,user_id:'victim'},{confirmation:'DELETE',permanent:false}]){
    const {handler,calls}=server();assert.equal((await handler(request(body))).status,400);assert.equal(calls.some(call=>call[0]==='delete'),false)
  }
  assert.equal((await server({user:null}).handler(request())).status,401)
  assert.equal((await server().handler(request(undefined,{authorization:''}))).status,401)
  const unavailable=server({readiness:false});assert.equal((await unavailable.handler(request())).status,503);assert.equal(unavailable.calls.some(call=>call[0]==='delete'),false)
  assert.equal((await server().handler(request({confirmation:'x'.repeat(1500),permanent:true}))).status,413)
})

test('server CORS is restricted and internal deletion failures do not leak server details',async()=>{
  const denied=server();assert.equal((await denied.handler(request(undefined,{origin:'https://untrusted.example'}))).status,403);assert.equal(denied.calls.length,0)
  const allowed=await server().handler(request(undefined,{origin:'https://closuree.vercel.app'}));assert.equal(allowed.headers.get('access-control-allow-origin'),'https://closuree.vercel.app')
  const failed=await server({failure:true}).handler(request());assert.equal(failed.status,500);assert.doesNotMatch(await failed.text(),/private internal|verified-owner/)
  assert.equal((await server().handler(new Request('https://fixture',{method:'OPTIONS',headers:{origin:'https://closuree.vercel.app'}}))).status,204)
  assert.equal((await server().handler(new Request('https://fixture'))).status,405)
})


test('exports include a saved celebration opt-out in both readable and structured formats', async () => {
  const { service, calls } = fakeClient({ pages: { profiles: { 0: [{ id: 'owner', show_celebrations: false }] } } })
  const data = await service.exportAccountData('owner')
  assert.ok(calls.some(([name, fields]) => name === 'select' && fields.includes('show_celebrations')))
  assert.equal(JSON.parse(formatAccountExport(data, '2026-11-15', 'json').text).profile.show_celebrations, false)
  assert.match(formatAccountExport(data, '2026-11-15').text, /show celebrations: false/)
})
