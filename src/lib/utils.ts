export function hashString(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i)
  }
  return (hash >>> 0) / 4294967296
}

export function seededWaveOff(source: string, target: string, predicate: string): number {
  return hashString(source + "|" + target + "|" + predicate) * Math.PI * 2
}
