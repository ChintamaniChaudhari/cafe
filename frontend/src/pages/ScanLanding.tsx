/**
 * ScanLanding page — /s/:shortcode
 *
 * Called when a customer scans a QR code.
 * Hits GET /api/v1/s/{shortcode} to create/reuse a session,
 * then redirects to the menu page.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { scanQR } from '../api/client'

export default function ScanLanding() {
  const { shortcode } = useParams<{ shortcode: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shortcode) return

    scanQR(shortcode)
      .then((data) => {
        // Store session info for later use
        localStorage.setItem('cafeos_session_data', JSON.stringify(data.data))
        // Redirect to menu
        navigate('/menu', { replace: true })
      })
      .catch((err) => {
        setError(err.message || 'Failed to scan QR code')
      })
  }, [shortcode, navigate])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="glass rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">😞</div>
          <h1 className="text-xl font-bold text-red-400 mb-2">Scan Failed</h1>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-4">
            Please try scanning the QR code again
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-white mb-2">Setting up your table...</h1>
        <p className="text-gray-400 text-sm">This will only take a moment</p>
      </div>
    </div>
  )
}
