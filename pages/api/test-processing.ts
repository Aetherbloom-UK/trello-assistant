// pages/api/test-processing.ts - Test endpoint for manually testing email processing
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Sample meeting email content for testing
    const testEmailData = {
      subject: 'Test Meeting Summary - Project Kickoff',
      sender: 'test@example.com',
      'body-plain': `
Meeting Summary: Project Kickoff
Date: June 1, 2025

Attendees:
- John Smith (Project Manager)
- Sarah Johnson (Developer)
- Mike Chen (Designer)

Summary:
We discussed the new website redesign project. The team will focus on improving user experience and implementing a modern design system. Budget approved for $50,000 with a 3-month timeline.

Action Items:
1. Sarah will create technical specifications by June 15, 2025
2. Mike will design wireframes and mockups by June 10, 2025
3. John will schedule weekly check-in meetings starting next week
4. Sarah will set up development environment by June 5, 2025

Next meeting scheduled for June 8, 2025 at 2:00 PM.
      `,
      recipient: 'meeting-automation@test.com',
      timestamp: new Date().toISOString(),
      'message-headers': ''
    }

    // Call the main processing endpoint with test data
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-meeting-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailData)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Processing failed: ${result.error}`)
    }

    res.status(200).json({
      success: true,
      message: 'Test email sent for processing',
      emailId: result.emailId,
      test_data: testEmailData
    })

  } catch (error) {
    console.error('Error in test processing:', error)
    res.status(500).json({
      error: 'Test processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}