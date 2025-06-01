// pages/api/status.ts - API route for system status and health checks
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import { testOpenAIConnection } from '../../lib/openai'
import { trelloClient } from '../../lib/trello'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get processing statistics
    const stats = await getProcessingStats()
    
    // Get recent emails
    const recentEmails = await getRecentEmails()
    
    // Test service connections
    const serviceHealth = await testServiceConnections()

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      statistics: stats,
      recent_emails: recentEmails,
      service_health: serviceHealth
    })

  } catch (error) {
    console.error('Error getting system status:', error)
    res.status(500).json({
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function getProcessingStats() {
  try {
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('emails')
      .select('status')

    if (statusError) throw statusError

    const stats = {
      total: statusCounts?.length || 0,
      received: 0,
      parsing: 0,
      parsed: 0,
      creating_trello_cards: 0,
      completed: 0,
      failed: 0
    }

    statusCounts?.forEach(record => {
      if (record.status in stats) {
        stats[record.status as keyof typeof stats]++
      }
    })

    // Get success rate
    const successRate = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0

    // Get processing times for completed emails
    const { data: completedEmails, error: completedError } = await supabase
      .from('emails')
      .select('created_at, processing_completed_at')
      .eq('status', 'completed')
      .not('processing_completed_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (completedError) throw completedError

    const avgProcessingTime = calculateAverageProcessingTime(completedEmails || [])

    return {
      ...stats,
      success_rate: `${successRate}%`,
      average_processing_time: avgProcessingTime
    }

  } catch (error) {
    console.error('Error getting processing stats:', error)
    return {
      total: 0,
      received: 0,
      parsing: 0,
      parsed: 0,
      creating_trello_cards: 0,
      completed: 0,
      failed: 0,
      success_rate: '0%',
      average_processing_time: 'Unknown'
    }
  }
}

async function getRecentEmails() {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select(`
        id,
        email_subject,
        email_sender,
        status,
        created_at,
        processing_completed_at,
        error_message,
        trello_summary_card_id
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return data?.map(email => ({
      id: email.id,
      subject: email.email_subject,
      sender: email.email_sender,
      status: email.status,
      created_at: email.created_at,
      completed_at: email.processing_completed_at,
      has_trello_card: !!email.trello_summary_card_id,
      error: email.error_message
    })) || []

  } catch (error) {
    console.error('Error getting recent emails:', error)
    return []
  }
}

async function testServiceConnections() {
  const results = {
    database: false,
    openai: false,
    trello: false
  }

  // Test database connection
  try {
    const { error } = await supabase
      .from('emails')
      .select('id')
      .limit(1)
    
    results.database = !error
  } catch (error) {
    console.error('Database connection test failed:', error)
    results.database = false
  }

  // Test OpenAI connection
  try {
    results.openai = await testOpenAIConnection()
  } catch (error) {
    console.error('OpenAI connection test failed:', error)
    results.openai = false
  }

  // Test Trello connection
  try {
    results.trello = await trelloClient.testConnection()
  } catch (error) {
    console.error('Trello connection test failed:', error)
    results.trello = false
  }

  return results
}

function calculateAverageProcessingTime(completedEmails: any[]): string {
  if (completedEmails.length === 0) return 'No data'

  const processingTimes = completedEmails
    .filter(email => email.created_at && email.processing_completed_at)
    .map(email => {
      const start = new Date(email.created_at).getTime()
      const end = new Date(email.processing_completed_at).getTime()
      return end - start
    })

  if (processingTimes.length === 0) return 'No data'

  const avgMs = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
  const avgSeconds = Math.round(avgMs / 1000)

  if (avgSeconds < 60) {
    return `${avgSeconds} seconds`
  } else if (avgSeconds < 3600) {
    return `${Math.round(avgSeconds / 60)} minutes`
  } else {
    return `${Math.round(avgSeconds / 3600)} hours`
  }
}