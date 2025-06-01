// lib/openai.ts - OpenAI client and meeting parsing logic
import OpenAI from 'openai'
import { ParsedMeetingData } from './supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key')
}

export async function parseMeetingEmail(emailContent: string, emailSubject: string): Promise<ParsedMeetingData> {
  const prompt = `
You are an AI assistant that extracts meeting information from emails. Parse the following meeting summary email and extract structured data.

Email Subject: "${emailSubject}"
Email Content: "${emailContent}"

Please extract the following information and return it as a JSON object:

1. A concise meeting summary (2-3 sentences)
2. Action items with assignees and due dates
3. Meeting participants
4. Meeting date/time if mentioned

Return the data in this exact JSON format:
{
  "summary": "Brief summary of the meeting",
  "action_items": [
    {
      "id": "unique_id",
      "task": "Description of the task",
      "assignee": "Person assigned (use 'Unassigned' if not specified)",
      "due_date": "YYYY-MM-DD or null if not specified",
      "priority": "low|medium|high (infer from context)",
      "completed": false
    }
  ],
  "participants": ["Name 1", "Name 2"],
  "meeting_date": "YYYY-MM-DD HH:mm or null if not found"
}

Important notes:
- Extract actual names from the content, don't make them up
- For action items without clear assignees, use "Unassigned"
- Infer priority based on urgency words or context
- Be conservative with due dates - only extract if clearly mentioned
- Generate unique IDs for action items using format: "ai_" + random string
`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts structured meeting data from emails. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let parsedData: ParsedMeetingData
    try {
      parsedData = JSON.parse(response)
    } catch (parseError) {
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error(`Failed to parse OpenAI response as JSON: ${response}`)
      }
    }

    // Validate and normalize the parsed data
    const validatedData = validateParsedData(parsedData)
    return validatedData

  } catch (error) {
    console.error('Error parsing meeting email with OpenAI:', error)
    throw new Error(`Failed to parse meeting email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function validateParsedData(data: any): ParsedMeetingData {
  // Ensure required fields exist and have correct types
  const validated: ParsedMeetingData = {
    summary: typeof data.summary === 'string' ? data.summary : 'Unable to extract meeting summary',
    action_items: Array.isArray(data.action_items) ? data.action_items.map(validateActionItem) : [],
    participants: Array.isArray(data.participants) ? data.participants.filter(p => typeof p === 'string') : [],
    meeting_date: typeof data.meeting_date === 'string' ? data.meeting_date : undefined
  }

  return validated
}

function validateActionItem(item: any): any {
  return {
    id: item.id || `ai_${Math.random().toString(36).substr(2, 9)}`,
    task: typeof item.task === 'string' ? item.task : 'Unknown task',
    assignee: typeof item.assignee === 'string' ? item.assignee : 'Unassigned',
    due_date: typeof item.due_date === 'string' ? item.due_date : null,
    priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
    completed: false
  }
}

// Test function to validate OpenAI connection
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'OK' if you can read this." }],
      max_tokens: 10
    })
    
    return completion.choices[0]?.message?.content?.includes('OK') || false
  } catch (error) {
    console.error('OpenAI connection test failed:', error)
    return false
  }
}