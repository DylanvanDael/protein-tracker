'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface DetectedBarcode {
  rawValue: string
  format: string
}

interface BarcodeDet {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}

interface BarcodeDetectorConstructor {
  new(options?: { formats: string[] }): BarcodeDet
  getSupportedFormats(): Promise<string[]>
}

declare const BarcodeDetector: BarcodeDetectorConstructor

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  function stopAll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    rafRef.current = null
    streamRef.current = null
  }

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setStatus('error')
      setErrorMsg('Barcode scanning is not supported in this browser. Try Chrome or Safari 17+.')
      return
    }

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    })

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStatus('scanning')
        scan()
      } catch {
        setStatus('error')
        setErrorMsg('Could not access camera. Please allow camera access and try again.')
      }
    }

    async function scan() {
      if (!videoRef.current || doneRef.current) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0 && !doneRef.current) {
          doneRef.current = true
          setStatus('found')
          stopAll()
          onDetected(barcodes[0].rawValue)
          return
        }
      } catch { /* frame not ready yet */ }
      rafRef.current = requestAnimationFrame(scan)
    }

    start()
    return stopAll
  }, [onDetected])

  function handleClose() {
    stopAll()
    onClose()
  }

  return (
    <div className="relative bg-black rounded-3xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Darken edges */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, transparent 60%, rgba(0,0,0,0.55) 100%)' }}
      />

      {/* Scan frame */}
      {status === 'scanning' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-40">
            {/* Corners */}
            {([
              'top-0 left-0',
              'top-0 right-0 [transform:scaleX(-1)]',
              'bottom-0 left-0 [transform:scaleY(-1)]',
              'bottom-0 right-0 [transform:scale(-1)]',
            ] as const).map((cls, i) => (
              <div key={i} className={`absolute ${cls} w-7 h-7`}>
                <div className="absolute top-0 left-0 w-full h-[3px] bg-white rounded-full" />
                <div className="absolute top-0 left-0 h-full w-[3px] bg-white rounded-full" />
              </div>
            ))}
            {/* Animated scan line */}
            <div className="absolute inset-x-2 h-[2px] bg-[#007AFF] rounded-full opacity-90 animate-bounce"
              style={{ animation: 'scanline 1.8s ease-in-out infinite', top: '50%' }}
            />
          </div>
        </div>
      )}

      {/* Status label */}
      <div className="absolute bottom-0 inset-x-0 px-4 pb-5 pt-8"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
      >
        <p className="text-white text-[14px] font-medium text-center">
          {status === 'starting' && 'Starting camera…'}
          {status === 'scanning' && 'Point at a barcode'}
          {status === 'found' && '✓ Barcode detected'}
        </p>
      </div>

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/80">
          <p className="text-white text-[14px] text-center leading-relaxed">{errorMsg}</p>
          <button
            onClick={handleClose}
            className="mt-5 px-6 py-2.5 rounded-2xl bg-white text-[#1C1C1E] font-semibold text-[15px]"
          >
            Close
          </button>
        </div>
      )}

      {/* Close button */}
      {status !== 'error' && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm"
        >
          <X size={17} />
        </button>
      )}

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-28px); opacity: 0.6; }
          50% { transform: translateY(28px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
