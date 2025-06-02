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

1. The existing meeting summary - IMPORTANT: If there's already a detailed "MEETING SUMMARY" or "Meeting Summary" section in the content, extract and preserve that entire section exactly as written. Do NOT create a new condensed summary. If no existing summary section is found, then create a brief 2-3 sentence summary.

2. Action items with assignees and due dates

3. Meeting participants

4. Meeting date/time if mentioned - look for specific dates, times, or phrases like "today", "yesterday", "this morning", etc.

Return the data in this exact JSON format:
{
  "summary": "The existing meeting summary content from the email, or brief summary if none exists",
  "action_items": [
    {
      "id": "unique_id",
      "task": "Description of the task",
      "assignee": "Person's first name only (use 'Unassigned' if not specified, never use company names)",
      "due_date": "YYYY-MM-DD or null if not specified",
      "priority": "low|medium|high (infer from context)",
      "completed": false
    }
  ],
  "participants": ["Name 1", "Name 2"],
  "meeting_date": "YYYY-MM-DD HH:mm or null if not found (be thorough in looking for dates)"
}

Important notes for summary extraction:
- Look for sections like "MEETING SUMMARY", "Meeting Summary", "Summary:", "SUMMARY", etc.
- If found, preserve the entire content of that section including subsections, bullet points, and formatting
- Include Meeting Purpose, Key Takeaways, Topics, and any other subsections that exist
- DO NOT condense or summarize an existing summary - preserve it as-is
- Only create a new brief summary if no existing summary section is found

Important notes for action items and assignees:
- Use ONLY first names for assignees (e.g., "James Daniel Whitford" becomes "James")
- "Aetherbloom" is a company name, NOT a person - do not assign tasks to "Aetherbloom"
- If a task is assigned to "Aetherbloom", try to infer the actual person from context (like "Della" or other participants), or use "Unassigned"
- Company names, organization names, or business names should never be used as assignees
- Examples: "James Daniel Whitford" → "James", "Sarah Johnson" → "Sarah", "Aetherbloom" → "Della" (if Della represents Aetherbloom) or "Unassigned"
- For action items without clear assignees, use "Unassigned"
- Infer priority based on urgency words or context
- Be conservative with due dates - only extract if clearly mentioned
- Generate unique IDs for action items using format: "ai_" + random string

Important notes for meeting dates:
- Look carefully for any date references in the content
- Check for relative dates like "today", "yesterday", "this morning", "last Friday"
- Check for explicit dates in various formats (June 1, 2025, 06/01/2025, 2025-06-01, etc.)
- Check email headers or signatures for meeting dates
- If no date is found, return null (we will set current date as fallback)
`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts structured meeting data from emails. Always respond with valid JSON. When a meeting summary already exists in the content, preserve it exactly as written rather than creating a new summary. Use only first names for task assignees and recognize that company names like 'Aetherbloom' are not people. Be thorough in extracting meeting dates."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 2000 // Increased to handle longer summaries
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
  let meetingDate = data.meeting_date

  // If no meeting date was extracted, use current date as fallback
  if (!meetingDate || meetingDate === null || meetingDate === 'null') {
    meetingDate = new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
    console.log('No meeting date found in content, using current date as fallback:', meetingDate)
  }

  const validated: ParsedMeetingData = {
    summary: typeof data.summary === 'string' ? data.summary : 'Unable to extract meeting summary',
    action_items: Array.isArray(data.action_items) ? data.action_items.map(validateActionItem) : [],
    participants: Array.isArray(data.participants) ? data.participants.filter((p: unknown): p is string => typeof p === 'string') : [],
    meeting_date: meetingDate
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