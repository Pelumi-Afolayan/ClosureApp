export function destinationAfterOnboarding(alreadyComplete) {
  return alreadyComplete ? '/today' : '/today?guide=1'
}

export function withoutGuideParameter(parameters) {
  const next = new URLSearchParams(parameters)
  next.delete('guide')
  return next
}
