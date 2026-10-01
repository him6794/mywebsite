import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { usePreferences } from '@/lib/preferences'

export default function MarkdownPreview({ content }: { content: string }) {
  const { t } = usePreferences()
  return (
    <article className="markdown editor-preview" data-lenis-prevent>
      {content ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {content}
        </ReactMarkdown>
      ) : (
        <p>{t('Nothing to preview yet.')}</p>
      )}
    </article>
  )
}
