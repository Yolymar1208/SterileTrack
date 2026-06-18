'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'

interface CameraQRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
  label?: string
}

export default function CameraQRScanner({ onScan, onClose, label = 'Scan QR Code' }: CameraQRScannerProps) {
  const scannerRef = useRef<any>(null)
  const mountedRef = useRef(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mountedRef.current = true

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mountedRef.current) return

        const html5QrCode = new Html5Qrcode('qr-reader-container')
        scannerRef.current = html5QrCode

        const cameras = await Html5Qrcode.getCameras()
        if (!cameras || cameras.length === 0) {
          setError('No camera found on this device.')
          setLoading(false)
          return
        }

        // Prefer back/environment camera
        const cameraId = cameras.find((c: any) =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        )?.id || cameras[cameras.length - 1].id

        await html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            stopScanner()
            onScan(decodedText)
          },
          () => {}
        )

        if (mountedRef.current) setLoading(false)
      } catch (err: any) {
        if (!mountedRef.current) return
        if (err?.name === 'NotAllowedError' || (err?.message || '').includes('Permission')) {
          setError('Camera permission denied. Please allow camera access in your browser settings.')
        } else {
          setError('Could not start camera. Type the QR code manually instead.')
        }
        setLoading(false)
      }
    }

    startScanner()
    return () => { mountedRef.current = false; stopScanner() }
  }, [])

  function stopScanner() {
    try {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    } catch (_) {}
  }

  function handleClose() {
    stopScanner()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-brand-500" />
            <span className="font-medium text-gray-800 text-sm">{label}</span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="relative bg-black" style={{ minHeight: 300 }}>
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black">
              <Loader2 size={32} className="animate-spin text-brand-400" />
              <p className="text-white text-sm">Starting camera…</p>
            </div>
          )}
          {error ? (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-900" style={{ minHeight: 300 }}>
              <Camera size={40} className="text-gray-500 mb-3" />
              <p className="text-white text-sm leading-relaxed">{error}</p>
            </div>
          ) : (
            <div id="qr-reader-container" className="w-full" style={{ minHeight: 300 }} />
          )}
        </div>

        <div className="px-4 py-3 text-center bg-white">
          <p className="text-xs text-gray-500">
            {error ? 'Close and type the QR code manually.' : 'Hold the QR code steady in the centre of the frame'}
          </p>
        </div>
      </div>
    </div>
  )
}
