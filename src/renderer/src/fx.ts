// Click ripple: a soft light that spreads from the exact point you pressed on any
// element marked `.tap` (buttons, switches, tiles). Pure decoration, no state.

export function installRipples() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.tap')
      if (!el || (el as HTMLButtonElement).disabled) return
      const r = el.getBoundingClientRect()
      const size = Math.max(r.width, r.height) * 2.2
      const dot = document.createElement('span')
      dot.className = 'ripple'
      dot.style.width = dot.style.height = `${size}px`
      dot.style.left = `${e.clientX - r.left - size / 2}px`
      dot.style.top = `${e.clientY - r.top - size / 2}px`
      el.appendChild(dot)
      dot.addEventListener('animationend', () => dot.remove(), { once: true })
    },
    true
  )
}
