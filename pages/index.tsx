// pages/index.tsx - Main landing page with setup instructions
import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Meeting Automation System</title>
        <meta name="description" content="Automatically process meeting summaries and create Trello cards" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">Meeting Automation System</h1>
          
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">1</div>
                <div>
                  <h3 className="font-medium">Forward Meeting Emails</h3>
                  <p className="text-gray-600">Forward meeting summary emails from Fathom or Scribbl to your automation email address.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">2</div>
                <div>
                  <h3 className="font-medium">AI Processing</h3>
                  <p className="text-gray-600">OpenAI extracts meeting summaries, action items, assignees, and due dates.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">3</div>
                <div>
                  <h3 className="font-medium">Trello Integration</h3>
                  <p className="text-gray-600">Automatically creates cards in your Trello board for summaries and action items.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">4</div>
                <div>
                  <h3 className="font-medium">Track Progress</h3>
                  <p className="text-gray-600">Monitor processing status and retry failed emails through the dashboard.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">📊 Dashboard</h3>
              <p className="text-gray-600 mb-4">
                View processing statistics, service health, and manage failed emails.
              </p>
              <Link href="/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded inline-block">
                Open Dashboard
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">🔧 API Endpoints</h3>
              <p className="text-gray-600 mb-4">
                API routes for webhook integration and system management.
              </p>
              <div className="space-y-2 text-sm">
                <div><code className="bg-gray-100 px-2 py-1 rounded">/api/process-meeting-email</code> - Main webhook</div>
                <div><code className="bg-gray-100 px-2 py-1 rounded">/api/status</code> - System status</div>
                <div><code className="bg-gray-100 px-2 py-1 rounded">/api/health</code> - Health check</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">🛠️ Setup Instructions</h3>
            
            <h4 className="font-medium mb-2">1. Environment Variables</h4>
            <p className="text-gray-600 mb-4">Configure your <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file with:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600 mb-6">
              <li>Supabase URL and service role key</li>
              <li>OpenAI API key</li>
              <li>Trello API key, token, and board/list IDs</li>
            </ul>

            <h4 className="font-medium mb-2">2. Database Setup</h4>
            <p className="text-gray-600 mb-4">Run the SQL schema in your Supabase project:</p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mb-6">
{`-- Run this in your Supabase SQL editor
-- See supabase/schema.sql for complete schema`}
            </pre>

            <h4 className="font-medium mb-2">3. Email-to-Webhook Service</h4>
            <p className="text-gray-600 mb-4">Set up Mailgun or similar service to forward emails to:</p>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              https://your-app.vercel.app/api/process-meeting-email
            </code>

            <h4 className="font-medium mb-2 mt-6">4. Trello Board Setup</h4>
            <p className="text-gray-600 mb-4">Create lists in your Trello board:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
              <li><strong>Meeting Summaries</strong> - For meeting overview cards</li>
              <li><strong>Action Items</strong> - For individual task cards</li>
              <li><strong>Completed Items</strong> - For finished tasks (optional)</li>
            </ul>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Need help? Check the{' '}
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                dashboard
              </Link>
              {' '}for system status and testing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}