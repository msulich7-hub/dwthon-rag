"use client"

import * as React from 'react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type MesCameraScannerProps = {
  onScan: (value: string) => void
  active?: boolean
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
}

export function MesCameraScanner({ onScan, active = false }: MesCameraScannerProps) {
  const t = useT()
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [enabled, setEnabled] = React.useState(active)
  const [supported, setSupported] = React.useState<boolean | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const lastScanRef = React.useRef('')

  React.useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  React.useEffect(() => {
    if (!enabled || !supported) return

    let cancelled = false
    let frameId = 0

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const Detector = (window as unknown as { BarcodeDetector: new () => BarcodeDetectorLike })
          .BarcodeDetector
        const detector = new Detector()

        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const value = codes[0]?.rawValue?.trim().toUpperCase()
            if (value && value !== lastScanRef.current) {
              lastScanRef.current = value
              onScan(value)
            }
          } catch {
            // ignore frame errors
          }
          frameId = window.requestAnimationFrame(() => void tick())
        }
        frameId = window.requestAnimationFrame(() => void tick())
      } catch {
        setError(t('mes.camera.error', 'Camera access denied or unavailable'))
        setEnabled(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [enabled, onScan, supported, t])

  if (supported === false) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('mes.camera.unsupported', 'Camera QR scanning is not supported in this browser. Use manual scan input.')}
      </p>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t('mes.camera.title', 'Camera scanner')}</span>
        <Button type="button" size="sm" variant={enabled ? 'secondary' : 'outline'} onClick={() => setEnabled((v) => !v)}>
          {enabled ? t('mes.camera.stop', 'Stop') : t('mes.camera.start', 'Start camera')}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {enabled ? (
        <video ref={videoRef} className="w-full max-h-48 rounded-md bg-black object-cover" muted playsInline />
      ) : null}
    </div>
  )
}
