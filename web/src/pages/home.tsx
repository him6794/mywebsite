import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { ErrorState, Loading, ProjectCard, SectionHeading, SkillGroups } from '@/components/content'
import { ProjectStory } from '@/components/project-story'
import { useResource } from '@/lib/use-resource'
import { imageURL, type HomeData } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

export default function Home() {
  const { t } = usePreferences()
  const { data, loading, error } = useResource<HomeData>('/home')
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">
              <span className="status-dot" aria-hidden="true" />{' '}
              {t('INDEPENDENT SOFTWARE ENGINEER')} <span className="eyebrow-rule" /> JUSTIN
            </p>
            <h1 id="hero-title">
              {t('Making complex')}
              <br />
              {t('systems feel')} <em>{t('simple.')}</em>
            </h1>
            <p className="hero-lead">
              {t(
                'I’m Justin. I design and build software across distributed systems, AI deployment, and the web — with equal care for what happens behind the scenes and what people see.',
              )}
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#selected-work">
                {t('Explore my work')} <ArrowUpRight size={18} />
              </a>
              <Link className="text-link text-link-light" to="/contact">
                {t('Start a conversation')} <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit art-orbit-outer" />
            <div className="art-orbit art-orbit-middle" />
            <div className="art-orbit art-orbit-inner" />
            <div className="art-core">
              <img src={imageURL('/static/img/profile.jpg')} alt="" width="150" height="150" />
            </div>
            <div className="art-label art-label-top">{t('DESIGN / BUILD / REFINE')}</div>
            <div className="art-label art-label-bottom">
              {t('FORM FOLLOWS FUNCTION')} <span>↗</span>
            </div>
            <div className="art-cross art-cross-one">+</div>
            <div className="art-cross art-cross-two">+</div>
          </div>
        </div>
        <div className="shell hero-bottom">
          <span>{t('THOUGHTFUL BY DESIGN. RELIABLE BY DEFAULT.')}</span>
          <a href="#approach">
            {t('SCROLL TO EXPLORE')} <ArrowDown size={14} />
          </a>
        </div>
      </section>
      <section className="intro-section section-pad" id="approach" aria-labelledby="approach-title">
        <div className="shell intro-grid">
          <div className="section-label">
            <span className="label-index">01 /</span> {t('THE APPROACH')}
          </div>
          <div className="intro-content">
            <h2 id="approach-title" className="statement">
              {t('Good engineering is more than making things work. It’s making them')}{' '}
              <span>{t('work beautifully, at every scale.')}</span>
            </h2>
            <div className="intro-bottom">
              <p>
                {t(
                  'I like to get to the heart of a problem, find the right architecture, then shape an experience that feels effortless. From infrastructure to interface, every detail has a job to do.',
                )}
              </p>
              <Link className="text-link" to="/experience">
                {t('More about my expertise')} <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <section
            className="work-section section-pad"
            id="selected-work"
            aria-labelledby="work-title"
          >
            <div className="shell">
              <SectionHeading
                index="02"
                label="SELECTED WORK"
                title="Projects, built with purpose"
                href="/portfolio"
                link="All projects"
              />
              {data.projects.length ? (
                <>
                  {data.projects.length < 2 ? (
                    <div className="project-grid">
                      {data.projects.map((project) => (
                        <ProjectCard key={project.ID} project={project} />
                      ))}
                    </div>
                  ) : (
                    <ProjectStory projects={data.projects.slice(0, 3)} />
                  )}
                  {data.projects.length > 3 && (
                    <div className="project-grid project-grid-overflow">
                      {data.projects.slice(3).map((project) => (
                        <ProjectCard key={project.ID} project={project} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="empty-note">{t('Project notes are on their way.')}</p>
              )}
            </div>
          </section>
          <section className="expertise-section section-pad" aria-labelledby="expertise-title">
            <div className="shell expertise-grid">
              <div>
                <p className="section-label">
                  <span className="label-index">03 /</span> {t('AREAS OF PRACTICE')}
                </p>
                <h2 id="expertise-title">
                  {t('From first idea')}
                  <br />
                  {t('to final detail')}
                  <span className="accent">.</span>
                </h2>
                <p className="expertise-intro">
                  {t(
                    'A practical toolkit shaped by solving real problems, not collecting buzzwords.',
                  )}
                </p>
                <Link className="text-link" to="/experience">
                  {t('Explore experience')} <ArrowUpRight size={17} />
                </Link>
              </div>
              <SkillGroups skills={data.skills} />
            </div>
          </section>
          {data.posts.length > 0 && (
            <section className="writing-section section-pad" aria-labelledby="writing-title">
              <div className="shell">
                <SectionHeading
                  index="04"
                  label="NOTES & IDEAS"
                  title="Thinking out loud"
                  href="/blog"
                  link="All writing"
                />
                <div className="writing-list">
                  {data.posts.map((post) => (
                    <Link className="writing-row" to={`/blog/${post.slug}`} key={post.id}>
                      <span className="writing-type">{t('FIELD NOTE')}</span>
                      <h3>{post.title}</h3>
                      <ArrowUpRight className="writing-arrow" size={24} strokeWidth={1.5} />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
