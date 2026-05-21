import { useEffect, useState } from 'react'
import { getFallosForLaw, type CSJNFallo } from './jurisprudencia'
import { extractLawNumberFromId } from './citations'

export function useFallosForItem(itemId: string | undefined): {
  fallos: CSJNFallo[]
  loading: boolean
} {
  const [fallos, setFallos] = useState<CSJNFallo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!itemId) {
      setFallos([])
      setLoading(false)
      return
    }
    const numero = extractLawNumberFromId(itemId)
    if (!numero) {
      setFallos([])
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    getFallosForLaw(numero)
      .then(f => {
        if (mounted) {
          setFallos(f)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setFallos([])
          setLoading(false)
        }
      })
    return () => { mounted = false }
  }, [itemId])

  return { fallos, loading }
}
