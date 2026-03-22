import { db } from '@/lib/db'
import { AIService } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai/types'

export interface WizardConfig {
  title: string
  genre: string
  narrativePerspective: string
  characterCount: number
  targetWords: number
}

export class WizardService {
  /**
   * Generate project outline using AI
   */
  async generateOutline(config: WizardConfig): Promise<string> {
    const service = new AIService()

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a professional novel outline writer. Create detailed chapter outlines based on the user requirements.',
      },
      {
        role: 'user',
        content: `Create a novel outline for:
- Title: ${config.title}
- Genre: ${config.genre}
- Perspective: ${config.narrativePerspective}
- Main Characters: ${config.characterCount}
- Target Length: ${config.targetWords} words

Please provide a structured outline with suggested chapter breakdown.`,
      },
    ]

    const response = await service.complete(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    })

    return response.content
  }

  /**
   * Generate character suggestions using AI
   */
  async generateCharacters(config: WizardConfig): Promise<Array<{ name: string; description: string }>> {
    const service = new AIService()

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a character creation expert. Generate compelling characters for novels.',
      },
      {
        role: 'user',
        content: `Generate ${config.characterCount} character suggestions for a ${config.genre} novel called "${config.title}".
For each character, provide their name and a brief description.

Format as JSON array:
[
  {"name": "Character Name", "description": "Brief description"},
  ...
]`,
      },
    ]

    const response = await service.complete(messages, {
      temperature: 0.8,
      maxTokens: 1500,
    })

    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response.content)
      return parsed
    } catch {
      // If JSON parsing fails, return a default character
      return [
        {
          name: 'Protagonist',
          description: 'The main character of the story',
        },
      ]
    }
  }

  /**
   * Create project with AI-generated content
   */
  async createProjectWithAI(
    userId: string,
    config: WizardConfig
  ): Promise<{ project: any; characters: any[]; outline: string }> {
    // Create project
    const project = await db.project.create({
      data: {
        userId,
        title: config.title,
        genre: config.genre,
        narrativePerspective: config.narrativePerspective,
        characterCount: config.characterCount,
        targetWords: config.targetWords,
      },
    })

    // Generate outline
    const outline = await this.generateOutline(config)

    // Generate characters
    const characterSuggestions = await this.generateCharacters(config)

    // Create characters in database
    const characters = await Promise.all(
      characterSuggestions.map((char) =>
        db.character.create({
          data: {
            projectId: project.id,
            name: char.name,
            description: char.description,
          },
        })
      )
    )

    return { project, characters, outline }
  }
}
