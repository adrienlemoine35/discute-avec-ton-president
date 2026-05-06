export interface Source {
  title: string | null
  url: string | null
  date: string | null
  type: string | null
  excerpt: string
  similarity?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  mode?: 'sourced' | 'styled'
  isLoading?: boolean
}

export interface AskResponse {
  answer: string
  sources: Source[]
  mode?: 'sourced' | 'styled'
  error?: string
}
