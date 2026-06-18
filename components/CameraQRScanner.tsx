'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'

interface CameraQRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
  label?: string
}

export default function CameraQRScanner({ onScan, onClose, label = 'Scan QR Code' }: CameraQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      setLoading(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setLoading(false)
          setScanning(true)
          scanLoop()
        }
      }
    } catch (err: any) {
      setError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : 'Could not access camera. Try typing the QR code manually instead.')
      setLoading(false)
    }
  }

  function stopCamera() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }

  function scanLoop() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanLoop)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Use BarcodeDetector if available (modern browsers)
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      detector.detect(canvas).then((codes: any[]) => {
        if (codes.length > 0) {
          const code = codes[0].rawValue
          stopCamera()
          onScan(code)
          return
        }
        animRef.current = requestAnimationFrame(scanLoop)
      }).catch(() => {
        animRef.current = requestAnimationFrame(scanLoop)
      })
    } else {
      // Fallback: just keep scanning visually, user may need to type
      animRef.current = requestAnimationFrame(scanLoop)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-brand-500" />
            <span className="font-medium text-gray-800 text-sm">{label}</span>
          </div>
          <button onClick={() => { stopCamera(); onClose() }} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
              <Loader2 size={32} className="animate-spin text-brand-400" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <Camera size={40} className="text-gray-500 mb-3" />
              <p className="text-white text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scanning overlay */}
              {scanning && !loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-52 relative">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-sm" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-sm" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-sm" />
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-2 h-0.5 bg-brand-400 opacity-80 animate-scan" style={{ top: '50%' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500">
            {error ? 'Close and type the code manually instead.' : 'Hold the QR code steady inside the frame'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-60px); opacity: 0.4; }
          50% { transform: translateY(60px); opacity: 1; }
        }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
