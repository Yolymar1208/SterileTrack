'use client'

import { Shield, WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield size={32} className="text-brand-300" />
        </div>

        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff size={22} className="text-red-400" />
        </div>

        <h1 className="text-white text-xl font-semibold mb-2">You're offline</h1>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          SterileTrack requires an internet connection to sync instrument data with the hospital server.
          Please check your Wi-Fi or mobile data connection.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 mx-auto bg-brand-400 hover:bg-brand-500 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>

        <p className="text-white/30 text-xs mt-6">
          Pages you've visited recently may still be available.
        </p>
      </div>
    </div>
  )
}
