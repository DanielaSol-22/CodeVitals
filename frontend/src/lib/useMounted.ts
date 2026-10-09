import { useEffect, useState } from 'react'

/** Devuelve false en el primer render y true en el siguiente cuadro; sirve para animar de 0 al valor real. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted
}
