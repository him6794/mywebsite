export interface Project {
  ID: number
  Title: string
  Description: string
  Image: string
  GithubURL: string
  DemoURL: string
  CreatedAt: string
}
export interface Experience {
  ID: number
  Title: string
  Company: string
  Period: string
  Description: string
  Order: number
}
export interface Skill {
  ID: number
  Name: string
  Category: string
  Icon: string
}
export interface Friend {
  ID: number
  Name: string
  URL: string
  Description: string
  Logo: string
  Status: string
}
export interface Post {
  id: number
  title: string
  slug: string
  content: string
  tags: string
  createdAt: string
}
export interface Comment {
  id: number
  authorName: string
  content: string
  createdAt: string
}
export interface PostDetail extends Post {
  author: string
  updatedAt: string
  comments: Comment[]
}
export interface HomeData {
  projects: Project[]
  experiences: Experience[]
  skills: Skill[]
  posts: Post[]
}
export interface Session {
  authenticated: boolean
  username?: string
}
export interface AdminPost {
  ID: number
  Title: string
  Slug: string
  Content: string
  Tags: string
  CreatedAt: string
}
export interface AdminComment {
  ID: number
  PostID: number
  AuthorName: string
  AuthorEmail: string
  Content: string
  CreatedAt: string
  IsApproved: boolean
}
export interface Contact {
  ID: number
  Name: string
  Email: string
  Subject: string
  Message: string
  CreatedAt: string
  IsRead: boolean
}
export type AdminItem = Project | Experience | Skill | Friend | AdminPost | AdminComment | Contact

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

function backendURL(path: string): string {
  return `${API_BASE_URL}${path}`
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(backendURL(`/api${path}`), {
    ...options,
    credentials: 'include',
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body
}

export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) })
export const put = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) })
export const remove = (path: string) => api<void>(path, { method: 'DELETE' })

export function imageURL(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) {
    const url = new URL(path, 'https://placeholder.invalid')
    if (url.hostname === 'img.justin0711.com')
      return backendURL(`/static/images/${encodeURIComponent(url.pathname.split('/').pop() || '')}`)
    return path
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path
  return backendURL(`/static/${path.replace(/^\/?static\//, '').replace(/^\//, '')}`)
}

export function dateLabel(date: string, language: 'en' | 'zh-TW' = 'en'): string {
  return new Intl.DateTimeFormat(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function excerpt(text: string, length = 150): string {
  const clean = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > length ? `${clean.slice(0, length).trimEnd()}…` : clean
}
