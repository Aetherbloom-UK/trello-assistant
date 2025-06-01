// pages/api/retry-failed.ts - API route for retrying failed email processing
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import { retryFailedEmail } from './process-meeting-email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleRetrySpecificEmail(req, res)
  } else if (req.method === 'GET') {
    return handleGetFailedEmails(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleRetrySpecificEmail(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { emailId } = req.body

    if (!emailId) {
      return res.status(400).json({ error: 'Email ID is required' })
    }

    await retryFailedEmail(emailId)

    res.status(200).json({ 
      success: true, 
      message: `Retry initiated for email ${emailId}` 
    })

  } catch (error) {
    console.error('Error retrying failed email:', error)
    res.status(500).json({ 
      error: 'Failed to retry email processing',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetFailedEmails(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get all failed emails that can be retried
    const { data, error } = await supabase
      .from('emails')
      .select('id, email_subject, email_sender, error_message, retry_count, last_retry_at, created_at')
      .eq('status', 'failed')
      .lt('retry_count', 3) // Only show emails that haven't exceeded retry limit
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(200).json({ 
      success: true, 
      failed_emails: data || []
    })

  } catch (error) {
    console.error('Error fetching failed emails:', error)
    res.status(500).json({ 
      error: 'Failed to fetch failed emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}