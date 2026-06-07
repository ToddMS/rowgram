export interface BoatTypeOption {
  code: string
  name: string
  seats: number
  hasCox: boolean
  category: 'sculling' | 'sweep'
}

export const BOAT_TYPES: Array<BoatTypeOption> = [
  { code: '8+', name: 'Eight',           seats: 8, hasCox: true,  category: 'sweep' },
  { code: '4+', name: 'Coxed Four',      seats: 4, hasCox: true,  category: 'sweep' },
  { code: '4-', name: 'Coxless Four',    seats: 4, hasCox: false, category: 'sweep' },
  { code: '4x', name: 'Quad Sculls',     seats: 4, hasCox: false, category: 'sculling' },
  { code: '2-', name: 'Coxless Pair',    seats: 2, hasCox: false, category: 'sweep' },
  { code: '2x', name: 'Double Sculls',   seats: 2, hasCox: false, category: 'sculling' },
  { code: '1x', name: 'Single Sculls',   seats: 1, hasCox: false, category: 'sculling' },
]

export const getBoatType = (code: string) =>
  BOAT_TYPES.find((bt) => bt.code === code)
