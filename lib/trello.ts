// lib/trello.ts - Trello API client and integration logic
import axios from 'axios'
import { ParsedMeetingData, ActionItem } from './supabase'

const TRELLO_API_BASE = 'https://api.trello.com/1'
const API_KEY = process.env.TRELLO_API_KEY!
const TOKEN = process.env.TRELLO_TOKEN!
const BOARD_ID = process.env.TRELLO_BOARD_ID!
const MEETING_SUMMARIES_LIST_ID = process.env.TRELLO_MEETING_SUMMARIES_LIST_ID!
const ACTION_ITEMS_LIST_ID = process.env.TRELLO_ACTION_ITEMS_LIST_ID!

if (!API_KEY || !TOKEN || !BOARD_ID || !MEETING_SUMMARIES_LIST_ID || !ACTION_ITEMS_LIST_ID) {
  throw new Error('Missing Trello environment variables')
}

// Trello API response interfaces
interface TrelloCard {
  id: string
  name: string
  desc: string
  url: string
  dateLastActivity: string
}

interface TrelloMember {
  id: string
  username: string
  fullName: string
}

export class TrelloClient {
  private readonly authParams = `key=${API_KEY}&token=${TOKEN}`

  async createMeetingSummaryCard(
    meetingData: ParsedMeetingData,
    originalEmailSubject: string
  ): Promise<string> {
    try {
      const cardName = `Meeting Summary: ${originalEmailSubject.replace(/^(Fwd:|Re:)\s*/i, '')}`
      const cardDescription = this.formatMeetingSummaryDescription(meetingData)

      // Prepare card data
      const cardData: any = {
        name: cardName,
        desc: cardDescription,
        idList: MEETING_SUMMARIES_LIST_ID,
        pos: 'top' // Add to top of list
      }

      // Always add a due date for meeting summary cards
      // Use the meeting date if available, otherwise use current date
      let cardDueDate: string
      if (meetingData.meeting_date) {
        // If meeting_date includes time, use it; otherwise add a default time
        if (meetingData.meeting_date.includes(':')) {
          cardDueDate = new Date(meetingData.meeting_date).toISOString()
        } else {
          // Add default time of 12:00 PM for date-only strings
          cardDueDate = new Date(meetingData.meeting_date + 'T12:00:00').toISOString()
        }
      } else {
        // Fallback to current date with current time
        cardDueDate = new Date().toISOString()
      }

      cardData.due = cardDueDate

      const response = await axios.post(
        `${TRELLO_API_BASE}/cards?${this.authParams}`,
        cardData
      )

      const card: TrelloCard = response.data
      console.log(`Created meeting summary card: ${card.id} with due date: ${cardDueDate}`)
      return card.id

    } catch (error) {
      console.error('Error creating meeting summary card:', error)
      throw new Error(`Failed to create meeting summary card: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createActionItemCards(actionItems: ActionItem[], meetingDate?: string): Promise<string[]> {
    const createdCardIds: string[] = []

    for (const item of actionItems) {
      try {
        const cardId = await this.createActionItemCard(item, meetingDate)
        createdCardIds.push(cardId)
      } catch (error) {
        console.error(`Error creating action item card for "${item.task}":`, error)
        // Continue with other items even if one fails
      }
    }

    return createdCardIds
  }

  private async createActionItemCard(actionItem: ActionItem, meetingDate?: string): Promise<string> {
    const cardName = `${actionItem.task} (${actionItem.assignee})`
    const cardDescription = this.formatActionItemDescription(actionItem)

    const cardData: any = {
      name: cardName,
      desc: cardDescription,
      idList: ACTION_ITEMS_LIST_ID,
      pos: 'top'
    }

    // Determine which date to use for the card
    let cardDueDate: string

    if (actionItem.due_date) {
      // Use the specific due date if provided
      cardDueDate = new Date(actionItem.due_date).toISOString()
    } else if (meetingDate) {
      // Use the meeting date if no specific due date is provided
      if (meetingDate.includes(':')) {
        cardDueDate = new Date(meetingDate).toISOString()
      } else {
        // Add default time for date-only strings
        cardDueDate = new Date(meetingDate + 'T12:00:00').toISOString()
      }
    } else {
      // Fall back to current date if no other date is available
      cardDueDate = new Date().toISOString()
    }

    // Add the determined due date to the card
    cardData.due = cardDueDate

    const response = await axios.post(
      `${TRELLO_API_BASE}/cards?${this.authParams}`,
      cardData
    )

    const card: TrelloCard = response.data

    // Add priority label
    await this.addPriorityLabel(card.id, actionItem.priority)

    console.log(`Created action item card: ${card.id} with due date: ${cardDueDate}`)
    return card.id
  }

  private async addPriorityLabel(cardId: string, priority: string): Promise<void> {
    try {
      // Get board labels
      const labelsResponse = await axios.get(
        `${TRELLO_API_BASE}/boards/${BOARD_ID}/labels?${this.authParams}`
      )

      const labels = labelsResponse.data
      let priorityLabel = labels.find((label: any) => 
        label.name.toLowerCase().includes(priority.toLowerCase())
      )

      // Create priority label if it doesn't exist
      if (!priorityLabel) {
        const labelColor = priority === 'high' ? 'red' : priority === 'medium' ? 'yellow' : 'green'
        const createLabelResponse = await axios.post(
          `${TRELLO_API_BASE}/labels?${this.authParams}`,
          {
            name: `Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}`,
            color: labelColor,
            idBoard: BOARD_ID
          }
        )
        priorityLabel = createLabelResponse.data
      }

      // Add label to card
      await axios.post(
        `${TRELLO_API_BASE}/cards/${cardId}/idLabels?${this.authParams}`,
        {
          value: priorityLabel.id
        }
      )

    } catch (error) {
      console.error('Error adding priority label:', error)
      // Don't throw - label addition is not critical
    }
  }

  private formatMeetingSummaryDescription(meetingData: ParsedMeetingData): string {
    let description = `## Meeting Summary\n\n${meetingData.summary}\n\n`

    if (meetingData.meeting_date) {
      description += `**Meeting Date:** ${meetingData.meeting_date}\n\n`
    }

    if (meetingData.participants.length > 0) {
      description += `**Participants:**\n${meetingData.participants.map(p => `- ${p}`).join('\n')}\n\n`
    }

    if (meetingData.action_items.length > 0) {
      description += `**Action Items Summary:**\n`
      meetingData.action_items.forEach((item, index) => {
        description += `${index + 1}. ${item.task} (${item.assignee})`
        if (item.due_date) {
          description += ` - Due: ${item.due_date}`
        }
        description += '\n'
      })
    }

    description += `\n---\n*Generated automatically from meeting email*`

    return description
  }

  private formatActionItemDescription(actionItem: ActionItem): string {
    let description = `**Task:** ${actionItem.task}\n\n`
    description += `**Assigned to:** ${actionItem.assignee}\n\n`
    description += `**Priority:** ${actionItem.priority.charAt(0).toUpperCase() + actionItem.priority.slice(1)}\n\n`
    
    if (actionItem.due_date) {
      description += `**Due Date:** ${actionItem.due_date}\n\n`
    }

    description += `**Status:** ${actionItem.completed ? 'Completed' : 'Pending'}\n\n`
    description += `---\n*Generated automatically from meeting email*`

    return description
  }

  // Test Trello connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${TRELLO_API_BASE}/boards/${BOARD_ID}?${this.authParams}`
      )
      return response.status === 200
    } catch (error) {
      console.error('Trello connection test failed:', error)
      return false
    }
  }

  // Get board lists for setup verification
  async getBoardLists(): Promise<Array<{id: string, name: string}>> {
    try {
      const response = await axios.get(
        `${TRELLO_API_BASE}/boards/${BOARD_ID}/lists?${this.authParams}`
      )
      return response.data.map((list: any) => ({
        id: list.id,
        name: list.name
      }))
    } catch (error) {
      console.error('Error fetching board lists:', error)
      throw error
    }
  }
}

export const trelloClient = new TrelloClient()