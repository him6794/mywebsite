import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { ErrorState, Loading, PageIntro, ProjectCard } from '@/components/content'
import { useResource } from '@/lib/use-resource'
import type { Project } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

export default function Portfolio() {
  const { t } = usePreferences()
  const { data, loading, error } = useResource<{ projects: Project[] }>('/projects')
  return (
    <>
      <PageIntro
        index="01"
        label="THE WORK"
        title="Built to solve"
        emphasis="real problems."
        description="Every project begins with a question worth answering. Here are some of the things I’ve worked on."
      />
      <section className="work-section section-pad">
        <div className="shell">
          {loading && <Loading />}
          {error && <ErrorState message={error} />}
          {data &&
            (data.projects.length ? (
              <div className="project-grid project-grid-all">
                {data.projects.map((project) => (
                  <ProjectCard project={project} key={project.ID} />
                ))}
              </div>
            ) : (
              <p className="empty-note">
                {t('There’s more to come. Have an idea?')}{' '}
                <Link to="/contact">{t('Let’s make it happen ↗')}</Link>
              </p>
            ))}
        </div>
      </section>
      <section className="closing-strip">
        <div className="shell closing-inner">
          <p>{t('Have a project in mind?')}</p>
          <Link to="/contact">
            {t('Let’s build something good')} <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
    </>
  )
}
