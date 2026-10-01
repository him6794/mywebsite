import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Language = 'en' | 'zh-TW'
export type Theme = 'light' | 'dark'

const LANGUAGE_KEY = 'site-language'
const THEME_KEY = 'site-theme'
const DARK_THEME_COLOR = '#171717'
const LIGHT_THEME_COLOR = '#ffffff'

const translations: Record<string, string> = {
  'Skip to content': '跳至主要內容',
  'Justin, home': 'Justin，首頁',
  'Close menu': '關閉選單',
  'Open menu': '開啟選單',
  'Main navigation': '主導覽列',
  'Admin navigation': '管理導覽列',
  Work: '作品',
  Expertise: '專業領域',
  Writing: '文章',
  Friends: '友站',
  'Get in touch': '聯絡我',
  'A NOTE FROM JUSTIN': 'Justin 的話',
  'Good work starts': '好的合作，始於',
  'with a conversation.': '一場對話。',
  'Let’s talk': '聊聊合作',
  'Built with intention.': '用心打造。',
  'Made for the web, not for show.': '為網路而造，不為炫耀。',
  'Switch language to Traditional Chinese': '切換至繁體中文',
  'Switch language to English': '切換至英文',
  'Switch to dark mode': '切換至深色模式',
  'Switch to light mode': '切換至淺色模式',
  'INDEPENDENT SOFTWARE ENGINEER': '獨立軟體工程師',
  'Making complex': '讓複雜的',
  'systems feel': '系統變得',
  'simple.': '簡單。',
  'I’m Justin. I design and build software across distributed systems, AI deployment, and the web — with equal care for what happens behind the scenes and what people see.':
    '我是 Justin，專注設計與打造分散式系統、AI 部署及網頁軟體；無論是幕後運作或使用者體驗，我都同樣用心。',
  'Explore my work': '瀏覽我的作品',
  'Start a conversation': '開始對話',
  'DESIGN / BUILD / REFINE': '設計 / 建構 / 精進',
  'FORM FOLLOWS FUNCTION': '形式追隨功能',
  'THOUGHTFUL BY DESIGN. RELIABLE BY DEFAULT.': '設計周全，可靠如常。',
  'SCROLL TO EXPLORE': '向下探索',
  'THE APPROACH': '我的方法',
  'Good engineering is more than making things work. It’s making them':
    '好的工程不只是讓事物運作，',
  'work beautifully, at every scale.': '更要讓它們在各種規模下都運作出色。',
  'I like to get to the heart of a problem, find the right architecture, then shape an experience that feels effortless. From infrastructure to interface, every detail has a job to do.':
    '我喜歡找出問題核心、選擇合適的架構，再打造流暢自然的使用體驗。從基礎設施到介面，每個細節都有其目的。',
  'More about my expertise': '深入了解我的專業',
  'SELECTED WORK': '精選作品',
  'Projects, built with purpose': '以解決問題為目標的作品',
  'All projects': '所有作品',
  'Project notes are on their way.': '作品介紹即將推出。',
  'AREAS OF PRACTICE': '專業領域',
  'From first idea': '從最初的想法',
  'to final detail': '到最後的細節',
  'A practical toolkit shaped by solving real problems, not collecting buzzwords.':
    '這套實用工具與技能，來自解決真實問題，而非追逐流行術語。',
  'Explore experience': '探索工作經歷',
  'NOTES & IDEAS': '筆記與想法',
  'Thinking out loud': '寫下所思所想',
  'All writing': '所有文章',
  'FIELD NOTE': '技術筆記',
  'THE WORK': '作品',
  'Built to solve': '為解決',
  'real problems.': '真實問題而打造。',
  'Every project begins with a question worth answering. Here are some of the things I’ve worked on.':
    '每個專案都始於一個值得解答的問題。以下是我曾參與的作品。',
  'There’s more to come. Have an idea?': '還有更多作品即將推出。有想法嗎？',
  'Let’s make it happen ↗': '一起實現它 ↗',
  'Have a project in mind?': '心中有個專案構想嗎？',
  'Let’s build something good': '一起打造好作品',
  'THE PRACTICE': '專業實踐',
  'Curiosity, backed': '好奇心，佐以',
  'by craft.': '扎實工藝。',
  'How I work, what I’ve learned, and the tools I reach for along the way.':
    '我的工作方式、所學所得，以及一路上使用的工具。',
  EXPERIENCE: '經歷',
  'Where ideas': '讓想法',
  'met execution': '落實為成果',
  'The story is still being written.': '故事仍在書寫中。',
  TOOLKIT: '技能工具箱',
  'Skills in service': '讓技能成為',
  'of ideas': '想法的助力',
  Thinking: '寫下所思',
  'out loud.': '所想。',
  'Notes on building things, figuring things out, and everything in between.':
    '記錄打造事物、解決問題，以及兩者之間的點滴。',
  'Search posts': '搜尋文章',
  'Search articles...': '搜尋文章…',
  Search: '搜尋',
  'FILTER /': '篩選 /',
  'All topics': '所有主題',
  'Clear filters': '清除篩選',
  NOTES: '筆記',
  'Read article': '閱讀文章',
  'No articles match your search. Try a different term.':
    '找不到符合搜尋條件的文章，請試試其他關鍵字。',
  EXPLORATION: '隨意探索',
  Something: '來點',
  'unexpected?': '意想不到的？',
  'Take a different path through the archive.': '換條路徑，探索文章典藏。',
  'Surprise me': '帶我隨機探索',
  'Browsing: {tag}': '目前瀏覽：{tag}',
  'THE CONVERSATION': '交流討論',
  Comments: '留言',
  'Newer article': '較新文章',
  'Older article': '較舊文章',
  'By {author}': '作者：{author}',
  Reply: '回覆',
  'Be the first to join the conversation.': '成為第一位留言交流的人。',
  'Leave a comment': '留下留言',
  Name: '姓名',
  Email: '電子郵件',
  '(not published)': '（不公開）',
  Comment: '留言',
  'Comment content': '留言內容',
  'Security check unavailable: {error}': '安全驗證目前無法使用：{error}',
  'Submitting...': '送出中…',
  'Submit comment': '送出留言',
  'GOOD COMPANY': '良師益友',
  'Better work,': '攜手合作，',
  'together.': '共創佳作。',
  'A small corner of the web for people and places worth knowing.':
    '網羅值得認識的人與網站的一隅。',
  'THE DIRECTORY': '友站名錄',
  'A good directory starts with the first connection.': '一份好名錄，從第一個連結開始。',
  'SAY HELLO': '打聲招呼',
  'Have a site': '有值得分享的',
  'to share': '網站嗎',
  'Send over the link. Applications are reviewed before they appear in the directory.':
    '歡迎提供連結。所有申請都會經過審核，再刊登於名錄。',
  'Site name': '網站名稱',
  'Your site’s name': '你的網站名稱',
  'Website URL': '網站網址',
  'Logo URL': '標誌網址',
  '(optional)': '（選填）',
  'A short introduction': '簡短介紹',
  'What’s it about?': '簡單介紹網站內容',
  'Submit site': '送出網站申請',
  'GET IN TOUCH': '聯絡我',
  'Let’s make': '一起打造',
  'something good.': '美好的事物。',
  'Have a question, a project, or just an idea worth sharing? I’d love to hear it.':
    '有問題、想合作，或有值得分享的想法嗎？期待聽聽你的故事。',
  'A DIRECT LINE': '直接聯繫',
  'Start wherever': '無論從哪裡',
  'you are': '開始都可以',
  'A little context goes a long way, but you don’t need a perfect brief to get in touch. Tell me what’s on your mind.':
    '簡單說明背景就很有幫助，但不需要準備完美的企劃才聯絡我。告訴我你正在想什麼吧。',
  'Find me on GitHub': '在 GitHub 找到我',
  'Your name': '你的姓名',
  'How should I address you?': '我該如何稱呼你？',
  'Email address': '電子郵件地址',
  'What’s this about?': '聯絡主旨',
  'A few words about your idea': '簡單描述你的想法',
  'Your message': '訊息內容',
  'Tell me a little more...': '再多分享一些吧…',
  'Sending...': '傳送中…',
  'Send message': '傳送訊息',
  'PRIVATE AREA': '私人管理區',
  'Welcome back.': '歡迎回來。',
  'Sign in to manage your site.': '登入以管理網站。',
  Username: '使用者名稱',
  Password: '密碼',
  'Signing in...': '登入中…',
  'Sign in': '登入',
  '← Back to site': '← 返回網站',
  OVERVIEW: '總覽',
  'Your workspace.': '你的工作空間。',
  'Everything in one place, without the noise.': '所有重要資訊，一目了然。',
  'View site': '查看網站',
  'Published posts': '已發布文章',
  Projects: '專案',
  'Friend requests': '友站申請',
  'Comments to review': '待審核留言',
  'Unread messages': '未讀訊息',
  'Visits today': '今日瀏覽',
  'Total visits': '累計瀏覽',
  Posts: '文章',
  Post: '文章',
  Project: '專案',
  Experience: '經歷',
  Skill: '技能',
  Skills: '技能',
  Friend: '友站',
  Message: '訊息',
  Untitled: '未命名',
  Title: '標題',
  'URL slug (leave blank to generate)': '網址代稱（留空則自動產生）',
  'Tags (comma-separated)': '標籤（以逗號分隔）',
  'Article (Markdown)': '文章內容（Markdown）',
  Description: '描述',
  'Image URL or static path': '圖片網址或靜態路徑',
  'Source URL': '原始碼網址',
  'Demo URL': '展示網址',
  Role: '職稱',
  Organisation: '組織／公司',
  Period: '期間',
  'Display order': '顯示順序',
  Category: '分類',
  'Icon class (optional)': '圖示類別（選填）',
  Status: '狀態',
  Messages: '訊息',
  'Edit {item}': '編輯{item}',
  'New {item}': '新增{item}',
  'Hide preview': '隱藏預覽',
  'Preview article': '預覽文章',
  Pending: '待處理',
  Approved: '已核准',
  pending: '待處理',
  approved: '已核准',
  'Saving...': '儲存中…',
  'Save changes': '儲存變更',
  Cancel: '取消',
  'CONTENT / {section}': '內容管理 / {section}',
  'Manage {items} on your site.': '管理網站上的{items}。',
  'Add {item}': '新增{item}',
  Details: '詳細資料',
  Actions: '操作',
  'Post #{id}': '文章 #{id}',
  Read: '已讀',
  Unread: '未讀',
  Edit: '編輯',
  Approve: '核准',
  Unapprove: '取消核准',
  'Mark unread': '標記為未讀',
  'Mark read': '標記為已讀',
  Delete: '刪除',
  'Delete {item}?': '刪除{item}？',
  'This action cannot be undone. “{item}” will be removed permanently.':
    '此操作無法復原。「{item}」將永久刪除。',
  'Nothing here yet.': '目前沒有內容。',
  WORKSPACE: '工作空間',
  Overview: '總覽',
  'Sign out': '登出',
  'Back to site': '返回網站',
  'Loading content': '正在載入內容',
  'Loading...': '載入中…',
  'Something went wrong: {message}': '發生錯誤：{message}',
  'Try again ↗': '再試一次 ↗',
  'SELECTED PROJECT': '精選專案',
  Source: '原始碼',
  'Live site': '線上網站',
  Other: '其他',
  'Nothing to preview yet.': '目前沒有可預覽的內容。',
  'Security check is unavailable.': '安全驗證目前無法使用。',
  'Security check could not load. Please try again.': '安全驗證載入失敗，請再試一次。',
  'Security check failed. Please refresh and try again.': '安全驗證失敗，請重新整理後再試一次。',
  '404 / WRONG TURN': '404 / 迷路了',
  'Nothing here': '這裡沒有內容',
  'The page you’re looking for may have moved.': '你要找的頁面可能已經移動。',
  'Back to the beginning ↗': '返回首頁 ↗',
  'Software engineer': '軟體工程師',
  Workspace: '管理工作區',
  Contact: '聯絡',
}

function readStored<T extends string>(key: string, fallback: T, values: readonly T[]): T {
  try {
    const value = localStorage.getItem(key) as T | null
    return value && values.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

function applyAppearance(language: Language, theme: Theme) {
  const root = document.documentElement
  root.lang = language
  root.classList.toggle('dark', theme === 'dark')
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute(
      'content',
      language === 'zh-TW'
        ? 'Justin 是一位軟體工程師，專注打造分散式系統、AI 部署與網頁體驗。'
        : 'Justin is a software engineer building thoughtful experiences across distributed systems, AI deployment, and the web.',
    )
}

// oxlint-disable-next-line react/only-export-components -- Applied before React renders to avoid a theme flash.
export function initializeAppearance() {
  const language = readStored<Language>(LANGUAGE_KEY, 'en', ['en', 'zh-TW'])
  const theme = readStored<Theme>(THEME_KEY, 'light', ['light', 'dark'])
  applyAppearance(language, theme)
}

type Preferences = {
  language: Language
  theme: Theme
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  toggleTheme: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}

const PreferencesContext = createContext<Preferences | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    readStored<Language>(LANGUAGE_KEY, 'en', ['en', 'zh-TW']),
  )
  const [theme, setTheme] = useState<Theme>(() =>
    readStored<Theme>(THEME_KEY, 'light', ['light', 'dark']),
  )

  useEffect(() => {
    applyAppearance(language, theme)
    try {
      localStorage.setItem(LANGUAGE_KEY, language)
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [language, theme])

  useEffect(() => {
    function syncPreferences(event: StorageEvent) {
      if (event.key === LANGUAGE_KEY && (event.newValue === 'en' || event.newValue === 'zh-TW')) {
        setLanguage(event.newValue)
      }
      if (event.key === THEME_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme(event.newValue)
      }
    }
    window.addEventListener('storage', syncPreferences)
    return () => window.removeEventListener('storage', syncPreferences)
  }, [])

  const toggleLanguage = useCallback(
    () => setLanguage((current) => (current === 'en' ? 'zh-TW' : 'en')),
    [],
  )
  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
    [],
  )
  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      let result = language === 'zh-TW' ? translations[key] || key : key
      for (const [name, value] of Object.entries(values || {})) {
        result = result.replaceAll(`{${name}}`, () => String(value))
      }
      return result
    },
    [language],
  )
  const value = useMemo(
    () => ({ language, theme, setLanguage, toggleLanguage, toggleTheme, t }),
    [language, theme, toggleLanguage, toggleTheme, t],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- Shared preference hook for page and layout components.
export function usePreferences() {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used within PreferencesProvider')
  return value
}
