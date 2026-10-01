import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Project, Skill } from '@/lib/api'
import { imageURL } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

export function PageIntro({
  index,
  label,
  title,
  emphasis,
  description,
}: {
  index: string
  label: string
  title: string
  emphasis: string
  description: string
}) {
  const { t } = usePreferences()
  return (
    <section className="page-hero">
      <div className="shell">
        <p className="section-label">
          <span className="label-index">{index} /</span> {t(label)}
        </p>
        <h1>
          {t(title)}
          <br />
          <em>{t(emphasis)}</em>
        </h1>
        <p>{t(description)}</p>
      </div>
    </section>
  )
}

export function SectionHeading({
  index,
  label,
  title,
  href,
  link,
}: {
  index: string
  label: string
  title: string
  href?: string
  link?: string
}) {
  const { t } = usePreferences()
  return (
    <div className="section-heading">
      <div>
        <p className="section-label">
          <span className="label-index">{index} /</span> {t(label)}
        </p>
        <h2>
          {t(title)}
          <span className="accent">.</span>
        </h2>
      </div>
      {href && link && (
        <Link className="text-link" to={href}>
          {t(link)} <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  )
}

export function ProjectCard({ project }: { project: Project }) {
  const { t } = usePreferences()
  return (
    <article>
      <Card className="project-card">
        <div className="project-visual">
          {project.Image && !/\.gif(?:$|\?)/i.test(project.Image) ? (
            <img
              src={imageURL(project.Image)}
              alt=""
              loading="lazy"
              decoding="async"
              width="600"
              height="380"
            />
          ) : (
            <div className="project-placeholder" aria-hidden="true">
              <span>
                J<span className="accent">.</span>
              </span>
            </div>
          )}
          <span className="project-label">{t('SELECTED PROJECT')}</span>
        </div>
        <CardContent className="project-details">
          <div>
            <h3>{project.Title}</h3>
            <p>{project.Description}</p>
          </div>
          <div className="project-links">
            {project.GithubURL && (
              <a href={project.GithubURL} target="_blank" rel="noopener noreferrer">
                {t('Source')} <ArrowUpRight size={15} />
              </a>
            )}
            {project.DemoURL && (
              <a href={project.DemoURL} target="_blank" rel="noopener noreferrer">
                {t('Live site')} <ArrowUpRight size={15} />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  )
}

export function SkillGroups({ skills }: { skills: Skill[] }) {
  const { t } = usePreferences()
  const groups = new Map<string, Skill[]>()
  for (const skill of skills) {
    const category = skill.Category || t('Other')
    groups.set(category, [...(groups.get(category) || []), skill])
  }
  return (
    <div className="expertise-list">
      {[...groups].map(([category, items]) => (
        <div className="expertise-row" key={category}>
          <h3>{category}</h3>
          <div className="tag-list">
            {items.map((skill) => (
              <Badge className="tag" variant="secondary" key={skill.ID}>
                {skill.Name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Loading() {
  const { t } = usePreferences()
  return (
    <div className="shell loading-state" role="status" aria-label={t('Loading content')}>
      <Skeleton className="loading-line" />
      <Skeleton className="loading-line short" />
      <span className="sr-only">{t('Loading...')}</span>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  const { t } = usePreferences()
  return (
    <div className="shell empty-note" role="alert">
      {t('Something went wrong: {message}', { message })}{' '}
      <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
        {t('Try again ↗')}
      </Button>
    </div>
  )
}
