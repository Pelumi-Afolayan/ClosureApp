// Run before React/CSS paint. Only a non-sensitive appearance preference is read.
;(function () {
  var preference = 'system'
  try { preference = localStorage.getItem('closure.theme') || 'system' } catch {}
  if (!['light', 'dark', 'system'].includes(preference)) preference = 'system'
  var dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = dark ? '#141a17' : '#faf7f0'
})()
