// pages/dashboard.tsx - Simple dashboard for monitoring the meeting automation system
import { useState, useEffect } from 'react'
import Head from 'next/head'

interface SystemStatus {
  statistics: {
    total: number
    completed: number
    failed: number
    success_rate: string
    average_processing_time: string
  }
  recent_emails: Array<{
    id: string
    subject: string
    sender: string
    status: string
    created_at: string
    completed_at?: string
    has_trello_card: boolean
    error?: string
  }>
  service_health: {
    database: boolean
    openai: boolean
    trello: boolean
  }
}

interface FailedEmail {
  id: string
  email_subject: string
  email_sender: string
  error_message: string
  retry_count: number
  created_at: string
}

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [failedEmails, setFailedEmails] = useState<FailedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
    fetchFailedEmails()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStatus()
      fetchFailedEmails()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      if (data.success) {
        setStatus(data)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFailedEmails = async () => {
    try {
      const response = await fetch('/api/retry-failed')
      const data = await response.json()
      if (data.success) {
        setFailedEmails(data.failed_emails)
      }
    } catch (error) {
      console.error('Error fetching failed emails:', error)
    }
  }

  const retryEmail = async (emailId: string) => {
    setRetrying(emailId)
    try {
      const response = await fetch('/api/retry-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('Retry initiated successfully')
        fetchFailedEmails() // Refresh the list
      } else {
        alert(`Retry failed: ${data.error}`)
      }
    } catch (error) {
      alert(`Error retrying email: ${error}`)
    } finally {
      setRetrying(null)
    }
  }

  const testProcessing = async () => {
    try {
      const response = await fetch('/api/test-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      if (data.success) {
        alert(`Test email processing started. Email ID: ${data.emailId}`)
        setTimeout(() => fetchStatus(), 2000) // Refresh after 2 seconds
      } else {
        alert(`Test failed: ${data.error}`)
      }
    } catch (error) {
      alert(`Error running test: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Meeting Automation Dashboard</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Meeting Automation Dashboard</h1>

        {/* Service Health */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Service Health</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-3 rounded ${status?.service_health.database ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="font-medium">Database</div>
              <div className={status?.service_health.database ? 'text-green-600' : 'text-red-600'}>
                {status?.service_health.database ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
            <div className={`p-3 rounded ${status?.service_health.openai ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="font-medium">OpenAI</div>
              <div className={status?.service_health.openai ? 'text-green-600' : 'text-red-600'}>
                {status?.service_health.openai ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
            <div className={`p-3 rounded ${status?.service_health.trello ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="font-medium">Trello</div>
              <div className={status?.service_health.trello ? 'text-green-600' : 'text-red-600'}>
                {status?.service_health.trello ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Processing Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{status?.statistics.total || 0}</div>
              <div className="text-gray-600">Total Emails</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{status?.statistics.completed || 0}</div>
              <div className="text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{status?.statistics.failed || 0}</div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{status?.statistics.success_rate || '0%'}</div>
              <div className="text-gray-600">Success Rate</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Average Processing Time: {status?.statistics.average_processing_time || 'Unknown'}
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Testing</h2>
          <button
            onClick={testProcessing}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Run Test Email Processing
          </button>
          <p className="text-sm text-gray-600 mt-2">
            This will send a sample meeting email through the processing pipeline.
          </p>
        </div>

        {/* Recent Emails */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Emails</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Subject</th>
                  <th className="text-left py-2">Sender</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Received</th>
                  <th className="text-left py-2">Trello</th>
                </tr>
              </thead>
              <tbody>
                {status?.recent_emails.map((email) => (
                  <tr key={email.id} className="border-b">
                    <td className="py-2 truncate max-w-xs" title={email.subject}>
                      {email.subject}
                    </td>
                    <td className="py-2">{email.sender}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        email.status === 'completed' ? 'bg-green-100 text-green-800' :
                        email.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {email.status}
                      </span>
                    </td>
                    <td className="py-2 text-sm">
                      {new Date(email.created_at).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {email.has_trello_card ? '✅' : '❌'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failed Emails */}
        {failedEmails.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Failed Emails (Can Retry)</h2>
            <div className="space-y-4">
              {failedEmails.map((email) => (
                <div key={email.id} className="border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{email.email_subject}</h3>
                      <p className="text-sm text-gray-600">From: {email.email_sender}</p>
                      <p className="text-sm text-red-600 mt-1">Error: {email.error_message}</p>
                      <p className="text-xs text-gray-500">
                        Retry Count: {email.retry_count} | 
                        Created: {new Date(email.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => retryEmail(email.id)}
                      disabled={retrying === email.id}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                    >
                      {retrying === email.id ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}