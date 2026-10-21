import { inr } from '../lib/format.js'

// No animation: shows the value straight away. Kept as a component so call sites stay unchanged.
export default function CountUp({ value, format = inr }) {
  return <>{format(value)}</>
}
