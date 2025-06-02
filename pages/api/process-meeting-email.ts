// pages/api/process-meeting-email.ts - Main API route for processing meeting emails
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, EmailRecord } from '../../lib/supabase'
import { parseMeetingEmail } from '../../lib/openai'
import { trelloClient } from '../../lib/trello'

interface MailgunWebhookData {
  'body-plain': string
  'body-html': string
  subject: string
  sender: string
  recipient: string
  timestamp: string
  'message-headers': string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Received email processing request')

    // Parse the incoming email data (from Mailgun webhook)
    const emailData = parseEmailFromRequest(req)
    
    // Step 1: Store email in database immediately
    const emailRecord = await storeEmailRecord(emailData)
    console.log(`Stored email record with ID: ${emailRecord.id}`)

    // Step 2: Process the email asynchronously (don't wait for completion)
    processEmailAsync(emailRecord.id).catch(error => {
      console.error(`Background processing failed for email ${emailRecord.id}:`, error)
    })

    // Return success immediately (processing continues in background)
    res.status(200).json({ 
      success: true, 
      emailId: emailRecord.id,
      message: 'Email received and processing started' 
    })

  } catch (error) {
    console.error('Error in email processing endpoint:', error)
    res.status(500).json({ 
      error: 'Failed to process email',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function parseEmailFromRequest(req: NextApiRequest): MailgunWebhookData {
  // Handle both URL-encoded (Mailgun) and JSON data
  const data = req.body

  // Validate required fields
  const subject = data.subject || data['Subject'] || 'No subject'
  const sender = data.sender || data['From'] || data.from || 'Unknown sender'
  const bodyPlain = data['body-plain'] || data.text || data.body || ''
  const bodyHtml = data['body-html'] || data.html || ''
  
  if (!bodyPlain && !bodyHtml) {
    throw new Error('Email body is empty')
  }

  return {
    'body-plain': bodyPlain,
    'body-html': bodyHtml,
    subject,
    sender,
    recipient: data.recipient || 'meeting-automation@your-domain.com',
    timestamp: data.timestamp || new Date().toISOString(),
    'message-headers': data['message-headers'] || ''
  }
}

async function storeEmailRecord(emailData: MailgunWebhookData): Promise<EmailRecord> {
  const { data, error } = await supabase
    .from('emails')
    .insert({
      email_subject: emailData.subject,
      email_body: emailData['body-plain'] || emailData['body-html'],
      email_sender: emailData.sender,
      email_received_at: new Date(emailData.timestamp).toISOString(),
      status: 'received'
    })
    .select()
    .single()

  if (error) {
    console.error('Database error storing email:', error)
    throw new Error(`Failed to store email: ${error.message}`)
  }

  return data as EmailRecord
}

async function processEmailAsync(emailId: string): Promise<void> {
  try {
    console.log(`Starting background processing for email ${emailId}`)

    // Update status to parsing
    await updateEmailStatus(emailId, 'parsing')

    // Get the email record
    const { data: emailRecord, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single()

    if (fetchError || !emailRecord) {
      throw new Error(`Failed to fetch email record: ${fetchError?.message}`)
    }

    // Step 1: Parse with OpenAI
    console.log(`Parsing email content with OpenAI for ${emailId}`)
    const parsedData = await parseMeetingEmail(emailRecord.email_body, emailRecord.email_subject)

    // Update database with parsed data
    await supabase
      .from('emails')
      .update({
        status: 'parsed',
        meeting_summary: parsedData.summary,
        action_items: parsedData.action_items,
        meeting_participants: parsedData.participants,
        meeting_date: parsedData.meeting_date
      })
      .eq('id', emailId)

    console.log(`Successfully parsed email ${emailId}`)

    // Step 2: Create Trello cards
    await updateEmailStatus(emailId, 'creating_trello_cards')

    console.log(`Creating Trello cards for email ${emailId}`)
    
    // Create meeting summary card
    const summaryCardId = await trelloClient.createMeetingSummaryCard(
      parsedData,
      emailRecord.email_subject
    )

    // Create action item cards with meeting date
    const actionItemCardIds = await trelloClient.createActionItemCards(
      parsedData.action_items,
      parsedData.meeting_date // Pass the meeting date here
    )

    // Final update: mark as completed
    await supabase
      .from('emails')
      .update({
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        trello_summary_card_id: summaryCardId,
        trello_action_item_card_ids: actionItemCardIds
      })
      .eq('id', emailId)

    console.log(`Successfully completed processing for email ${emailId}`)
    console.log(`Created summary card: ${summaryCardId}`)
    console.log(`Created ${actionItemCardIds.length} action item cards`)

  } catch (error) {
    console.error(`Processing failed for email ${emailId}:`, error)
    
    // Mark as failed and store error
    await supabase
      .from('emails')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: supabase.from('emails').select('retry_count').eq('id', emailId).then(r => (r.data?.[0]?.retry_count || 0) + 1)
      })
      .eq('id', emailId)
  }
}

async function updateEmailStatus(emailId: string, status: EmailRecord['status']): Promise<void> {
  const updateData: any = { status }
  
  if (status === 'parsing') {
    updateData.processing_started_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('emails')
    .update(updateData)
    .eq('id', emailId)

  if (error) {
    console.error(`Failed to update status to ${status} for email ${emailId}:`, error)
  }
}

// Helper function to manually retry failed emails
export async function retryFailedEmail(emailId: string): Promise<void> {
  const { data: emailRecord, error } = await supabase
    .from('emails')
    .select('*')
    .eq('id', emailId)
    .single()

  if (error || !emailRecord) {
    throw new Error(`Email record not found: ${emailId}`)
  }

  if (emailRecord.status !== 'failed') {
    throw new Error(`Email ${emailId} is not in failed status`)
  }

  // Reset status and retry
  await supabase
    .from('emails')
    .update({
      status: 'received',
      error_message: null,
      last_retry_at: new Date().toISOString()
    })
    .eq('id', emailId)

  // Process again
  await processEmailAsync(emailId)
}