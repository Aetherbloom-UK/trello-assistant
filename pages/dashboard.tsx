// pages/dashboard.tsx - Dashboard with CSS modules styling
import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Dashboard.module.css'

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
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Meeting Automation Dashboard</title>
      </Head>

      <div className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className={styles.title}>Meeting Automation Dashboard</h1>
          <Link href="/" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '0.875rem'
          }}>
            ← Back to Home
          </Link>
        </div>

        {/* Service Health */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Service Health</h2>
          <div className={styles.serviceGrid}>
            <div className={`${styles.serviceItem} ${status?.service_health.database ? styles.serviceItemGreen : styles.serviceItemRed}`}>
              <div className={styles.serviceTitle}>Database</div>
              <div className={styles.serviceStatus}>
                {status?.service_health.database ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
            <div className={`${styles.serviceItem} ${status?.service_health.openai ? styles.serviceItemGreen : styles.serviceItemRed}`}>
              <div className={styles.serviceTitle}>OpenAI</div>
              <div className={styles.serviceStatus}>
                {status?.service_health.openai ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
            <div className={`${styles.serviceItem} ${status?.service_health.trello ? styles.serviceItemGreen : styles.serviceItemRed}`}>
              <div className={styles.serviceTitle}>Trello</div>
              <div className={styles.serviceStatus}>
                {status?.service_health.trello ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Processing Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statValueBlue}`}>{status?.statistics.total || 0}</div>
              <div className={styles.statLabel}>Total Emails</div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statValueGreen}`}>{status?.statistics.completed || 0}</div>
              <div className={styles.statLabel}>Completed</div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statValueRed}`}>{status?.statistics.failed || 0}</div>
              <div className={styles.statLabel}>Failed</div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statValuePurple}`}>{status?.statistics.success_rate || '0%'}</div>
              <div className={styles.statLabel}>Success Rate</div>
            </div>
          </div>
          <div className={styles.statNote}>
            Average Processing Time: {status?.statistics.average_processing_time || 'Unknown'}
          </div>
        </div>

        {/* Test Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Testing</h2>
          <button onClick={testProcessing} className={styles.button}>
            Run Test Email Processing
          </button>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
            This will send a sample meeting email through the processing pipeline.
          </p>
        </div>

        {/* Recent Emails */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Recent Emails</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.tableHeaderCell}>Subject</th>
                  <th className={styles.tableHeaderCell}>Sender</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell}>Received</th>
                  <th className={styles.tableHeaderCell}>Trello</th>
                </tr>
              </thead>
              <tbody>
                {status?.recent_emails.map((email) => (
                  <tr key={email.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} ${styles.tableCellTruncate}`} title={email.subject}>
                      {email.subject}
                    </td>
                    <td className={styles.tableCell}>{email.sender}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.status} ${
                        email.status === 'completed' ? styles.statusCompleted :
                        email.status === 'failed' ? styles.statusFailed :
                        styles.statusProcessing
                      }`}>
                        {email.status}
                      </span>
                    </td>
                    <td className={styles.tableCell} style={{ fontSize: '0.75rem' }}>
                      {new Date(email.created_at).toLocaleString()}
                    </td>
                    <td className={styles.tableCell}>
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
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Failed Emails (Can Retry)</h2>
            <div>
              {failedEmails.map((email) => (
                <div key={email.id} className={styles.failedEmailCard}>
                  <div className={styles.failedEmailHeader}>
                    <div className={styles.failedEmailContent}>
                      <h3 className={styles.failedEmailTitle}>{email.email_subject}</h3>
                      <p className={styles.failedEmailMeta}>From: {email.email_sender}</p>
                      <p className={styles.failedEmailError}>Error: {email.error_message}</p>
                      <p className={styles.failedEmailDetails}>
                        Retry Count: {email.retry_count} | 
                        Created: {new Date(email.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => retryEmail(email.id)}
                      disabled={retrying === email.id}
                      className={styles.retryButton}
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