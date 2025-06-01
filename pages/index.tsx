// pages/index.tsx - Landing page with built-in meeting submission form
import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [emailBody, setEmailBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      // Extract a subject from the content if possible, or use default
      const lines = emailBody.split('\n').filter(line => line.trim())
      const firstLine = lines[0] || 'Meeting Summary'
      const autoSubject = firstLine.length > 50 ? 'Meeting Summary' : firstLine

      const response = await fetch('/api/process-meeting-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: autoSubject,
          sender: 'manual-submission@user.com',
          'body-plain': emailBody,
          recipient: 'manual-submission',
          timestamp: new Date().toISOString(),
          'message-headers': ''
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          type: 'success',
          message: `✅ Success! Your meeting has been processed (ID: ${data.emailId}). Check your Trello board for new cards!`
        })
        setEmailBody('')
      } else {
        setResult({
          type: 'error',
          message: `❌ Error: ${data.error || 'Unknown error occurred'}`
        })
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Meeting Automation - Turn Emails into Trello Cards</title>
        <meta name="description" content="Automatically convert meeting summaries into organized Trello cards with AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>Meeting Automation</h1>
          <p className={styles.subtitle}>
            Transform your meeting summaries into organized Trello cards automatically. 
            Just paste your email content below and let AI do the rest!
          </p>
        </header>

        <div className={styles.content}>
          {/* Main Form Section */}
          <div className={styles.formSection}>
            <h2 className={styles.formTitle}>📧 Submit Your Meeting Content</h2>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="meeting-content" className={styles.label}>
                  Meeting Email Content
                </label>
                <textarea
                  id="meeting-content"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Paste your entire meeting summary email here...

Example:
Meeting: Project Kickoff
Date: June 1, 2025
Attendees: John, Sarah, Mike

Summary: We discussed the project timeline and assigned initial tasks...

Action Items:
1. John will create project plan by June 10
2. Sarah will set up development environment by June 5
3. Mike will design wireframes by June 8"
                  rows={12}
                  className={styles.textarea}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !emailBody.trim()}
                className={styles.submitButton}
              >
                {isSubmitting ? '⏳ Processing...' : '🚀 Create Trello Cards'}
              </button>
            </form>

            {result && (
              <div className={`${styles.result} ${result.type === 'success' ? styles.resultSuccess : styles.resultError}`}>
                {result.message}
              </div>
            )}
          </div>

          {/* Information Section */}
          <div className={styles.infoSection}>
            <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                🎯 How It Works
              </h3>
              <div className={styles.infoCardContent}>
                <ul className={styles.stepsList}>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNumber}>1</span>
                    <span className={styles.stepText}>Copy your meeting email from Fathom or Scribbl</span>
                  </li>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNumber}>2</span>
                    <span className={styles.stepText}>Paste the entire content into the text area</span>
                  </li>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNumber}>3</span>
                    <span className={styles.stepText}>AI extracts summaries, action items, and assignees</span>
                  </li>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNumber}>4</span>
                    <span className={styles.stepText}>Organized Trello cards are created automatically</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                🔗 Quick Links
              </h3>
              <div className={styles.infoCardContent}>
                <ul className={styles.linksList}>
                  <li className={styles.linkItem}>
                    <Link href="/dashboard" className={styles.link}>
                      → View System Dashboard
                    </Link>
                  </li>
                  <li className={styles.linkItem}>
                    <a
                      href="https://trello.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      → Open Your Trello Board
                    </a>
                  </li>
                  <li className={styles.linkItem}>
                    <Link href="/api/test-processing" className={styles.link}>
                      → Test with Sample Data
                    </Link>
                  </li>
                  <li className={styles.linkItem}>
                    <Link href="/api/status" className={styles.link}>
                      → Check System Status
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.tip}>
                <h4 className={styles.tipTitle}>
                  💡 Pro Tips
                </h4>
                <div className={styles.tipContent}>
                  The AI works best when your content includes:
                  <br />• Clear meeting participants and roles
                  <br />• Specific action items with assignee names
                  <br />• Due dates ("by Friday", "June 10th", "next week")
                  <br />• Priority indicators ("urgent", "ASAP", "high priority")
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                📋 What Gets Created
              </h3>
              <div className={styles.infoCardContent}>
                <strong>Meeting Summary Card:</strong> Overview with participants, date, and key decisions
                <br /><br />
                <strong>Action Item Cards:</strong> Individual tasks with assignees, due dates, and priority labels
                <br /><br />
                <strong>Automatic Organization:</strong> Cards are sorted by priority and due date
              </div>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>
            Powered by AI • Built with Next.js • Deployed on Vercel
            <br />
            Turn meeting chaos into organized action items ✨
          </p>
        </footer>
      </div>
    </div>
  )
}