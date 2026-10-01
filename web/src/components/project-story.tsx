import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { ProjectCard } from '@/components/content'
import type { Project } from '@/lib/api'
import { imageURL } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

function ProjectVisual({ project }: { project: Project }) {
  return (
    <div className="project-story-visual">
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
    </div>
  )
}

export function ProjectStory({ projects }: { projects: Project[] }) {
  const { t } = usePreferences()
  const storyRef = useRef<HTMLDivElement>(null)
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.ID)
  const activeProject = projects.find((project) => project.ID === activeProjectId) || projects[0]

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const story = storyRef.current
    if (!story) return

    const media = window.matchMedia('(max-width: 780px)')
    const activeChapters = new Map<Element, boolean>()
    let observer: IntersectionObserver | null = null

    const observeChapters = () => {
      observer?.disconnect()
      activeChapters.clear()
      observer = null
      if (media.matches) return

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => activeChapters.set(entry.target, entry.isIntersecting))
          const viewportCenter = window.innerHeight / 2
          const activeChapter = [...activeChapters]
            .filter(([, isIntersecting]) => isIntersecting)
            .map(([element]) => {
              const rect = element.getBoundingClientRect()
              return {
                projectId: Number((element as HTMLElement).dataset.projectId),
                distance: Math.abs(rect.top + rect.height / 2 - viewportCenter),
              }
            })
            .sort((first, second) => first.distance - second.distance)[0]

          if (activeChapter) setActiveProjectId(activeChapter.projectId)
        },
        { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
      )

      story.querySelectorAll<HTMLElement>('.project-story-chapter').forEach((chapter) => {
        observer?.observe(chapter)
      })
    }

    observeChapters()
    media.addEventListener('change', observeChapters)

    return () => {
      media.removeEventListener('change', observeChapters)
      observer?.disconnect()
    }
  }, [projects])

  if (typeof IntersectionObserver === 'undefined') {
    return (
      <div className="project-grid project-story-fallback">
        {projects.map((project) => (
          <ProjectCard key={project.ID} project={project} />
        ))}
      </div>
    )
  }

  return (
    <div className="project-story" ref={storyRef} data-active-project-id={activeProject?.ID}>
      <div className="project-story-chapters">
        {projects.map((project, index) => {
          const isActive = project.ID === activeProject?.ID
          return (
            <article
              className={`project-story-chapter${isActive ? ' is-active' : ''}`}
              data-project-id={project.ID}
              id={`project-${project.ID}`}
              key={project.ID}
              aria-labelledby={`project-story-title-${project.ID}`}
            >
              <p className="project-story-kicker">
                <span>{String(index + 1).padStart(2, '0')} /</span> {t('SELECTED PROJECT')}
              </p>
              <h3 id={`project-story-title-${project.ID}`}>{project.Title}</h3>
              <div className="project-story-mobile-visual" aria-hidden="true">
                <ProjectVisual project={project} />
              </div>
              <p className="project-story-description">{project.Description}</p>
              <div className="project-story-links">
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
            </article>
          )
        })}
      </div>
      <div className="project-story-visual-column" aria-hidden="true">
        <div className="project-story-sticky">
          <div className="project-story-feature-stack">
            {projects.map((project, index) => {
              const isActive = project.ID === activeProject?.ID
              return (
                <div
                  className={`project-story-feature${isActive ? ' is-active' : ''}`}
                  data-project-id={project.ID}
                  key={project.ID}
                >
                  <ProjectVisual project={project} />
                  <div className="project-story-caption">
                    <span>
                      {String(index + 1).padStart(2, '0')} / {t('SELECTED PROJECT')}
                    </span>
                    <p>{project.Title}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
