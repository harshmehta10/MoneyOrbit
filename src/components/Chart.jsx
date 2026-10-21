import { useEffect, useRef } from 'react'
import { Chart, ArcElement, BarElement, DoughnutController, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

Chart.register(ArcElement, BarElement, DoughnutController, BarController, CategoryScale, LinearScale, Tooltip, Legend)

const COLORS = ['#2f4f44', '#c8a65e', '#9a4c3d', '#3f5468', '#6b4560', '#6b8a5e', '#5c5f2a', '#a8a29e']

// labels/values arrays; type: 'pie' | 'bar'
export default function ChartView({ type, labels, values, label = 'Amount' }) {
  const ref = useRef()
  useEffect(() => {
    const c = new Chart(ref.current, {
      type: type === 'pie' ? 'doughnut' : 'bar',
      data: { labels, datasets: [{ label, data: values, backgroundColor: type === 'pie' ? COLORS : '#2f4f44', borderColor: '#ffffff', borderRadius: type === 'pie' ? 0 : 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: type === 'pie', position: 'bottom' } } },
    })
    return () => c.destroy()
  }, [type, labels, values, label])
  return (
    <div className="h-64 w-full">
      <canvas ref={ref} role="img" aria-label={`${label} chart`}>
        {/* fallback text for screen readers */}
        <table><tbody>{labels.map((l, i) => <tr key={l}><td>{l}</td><td>{values[i]}</td></tr>)}</tbody></table>
      </canvas>
    </div>
  )
}
