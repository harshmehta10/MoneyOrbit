import { ForkKnife, Airplane, House, ShoppingBag, Receipt, Heartbeat, FilmSlate, Shapes } from '@icons'

// full class names so Tailwind can see them
const MAP = {
  Food: [ForkKnife, 'bg-sand-100 text-sand-700'],
  'Travel/Stay': [Airplane, 'bg-dusk-100 text-dusk-700'],
  Rent: [House, 'bg-plum-100 text-plum-700'],
  Shopping: [ShoppingBag, 'bg-clay-100 text-clay-700'],
  Bills: [Receipt, 'bg-brand-100 text-brand-700'],
  Health: [Heartbeat, 'bg-sage-100 text-sage-700'],
  Entertainment: [FilmSlate, 'bg-olive-100 text-olive-700'],
}
export function CatIcon({ name, className = 'size-10' }) {
  const [Icon, tone] = MAP[name] || [Shapes, 'bg-stone-200 text-stone-700']
  return <span className={`grid shrink-0 place-items-center rounded-xl ${tone} ${className}`}><Icon className="size-1/2" /></span>
}

const TONES = ['bg-brand-700', 'bg-clay-600', 'bg-dusk-700', 'bg-sand-600', 'bg-plum-700', 'bg-sage-600']
export function Avatar({ name = '?', className = 'size-9 text-xs' }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${TONES[i]} ${className}`}>{ini}</span>
}
