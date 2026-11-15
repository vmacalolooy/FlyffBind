/** BINDit wordmark: the name in a pure silver gradient. */
export function Wordmark({ text = 'BINDit', size = 30, className = '' }: { text?: string; size?: number; className?: string }) {
  return (
    <span className={`wordmark ${className}`} style={{ fontSize: size }}>
      {text}
    </span>
  )
}
