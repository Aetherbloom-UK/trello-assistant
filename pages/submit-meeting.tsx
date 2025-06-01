// pages/submit-meeting.tsx - Manual email submission page
import { useState } from 'react'
import Head from 'next/head'

export default function SubmitMeeting() {
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
          message: `Successfully processed! Email ID: ${data.emailId}. Check your Trello board and dashboard.`
        })
        setEmailBody('')
      } else {
        setResult({
          type: 'error',
          message: `Error: ${data.error || 'Unknown error occurred'}`
        })
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Submit Meeting Email</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Submit Meeting Email</h1>
          <p className="text-gray-600 mb-8">
            Paste your meeting summary email content below to automatically create Trello cards.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Email Content
                  </label>
                  <textarea
                    id="body"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Paste your entire meeting summary email here...

Example:
Meeting: Project Kickoff
Date: June 1, 2025
Attendees: John, Sarah, Mike

Summary: We discussed the project timeline...

Action Items:
1. John will create project plan by June 10
2. Sarah will set up development by June 5"
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isSubmitting ? 'Processing...' : 'Process Meeting Email'}
                </button>
              </form>

              {result && (
                <div className={`mt-4 p-4 rounded-md ${
                  result.type === 'success' 
                    ? 'bg-green-100 border border-green-300 text-green-700'
                    : 'bg-red-100 border border-red-300 text-red-700'
                }`}>
                  {result.message}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-3">How to Use</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 flex-shrink-0">1</span>
                    Copy the entire meeting email content from Fathom/Scribbl
                  </li>
                  <li className="flex">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 flex-shrink-0">2</span>
                    Paste it into the text area below
                  </li>
                  <li className="flex">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 flex-shrink-0">3</span>
                    Click "Process Meeting Email"
                  </li>
                  <li className="flex">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 flex-shrink-0">4</span>
                    Check your Trello board for new cards!
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <a
                    href="/dashboard"
                    className="block text-blue-600 hover:text-blue-800 text-sm"
                  >
                    → View Dashboard
                  </a>
                  <a
                    href="https://trello.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 text-sm"
                  >
                    → Open Trello Board
                  </a>
                  <a
                    href="/api/test-processing"
                    className="block text-blue-600 hover:text-blue-800 text-sm"
                  >
                    → Test with Sample Data
                  </a>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">💡 Pro Tip</h4>
                <p className="text-sm text-yellow-700">
                  Just copy and paste the entire email! The AI will automatically extract:
                  <br />• Meeting summary and participants
                  <br />• Action items with assignees
                  <br />• Due dates ("by Friday", "June 10th")
                  <br />• Priority levels ("urgent", "ASAP")
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}