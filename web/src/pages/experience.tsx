import { PageIntro, SkillGroups, Loading, ErrorState } from '@/components/content'
import { useResource } from '@/lib/use-resource'
import type { Experience as WorkExperience, Skill } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

export default function Experience() {
  const { t } = usePreferences()
  const { data, loading, error } = useResource<{ experiences: WorkExperience[]; skills: Skill[] }>(
    '/experience',
  )
  return (
    <>
      <PageIntro
        index="02"
        label="THE PRACTICE"
        title="Curiosity, backed"
        emphasis="by craft."
        description="How I work, what I’ve learned, and the tools I reach for along the way."
      />
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <section className="experience-section section-pad">
            <div className="shell content-grid">
              <div className="sticky-heading">
                <p className="section-label">{t('EXPERIENCE')}</p>
                <h2>
                  {t('Where ideas')}
                  <br />
                  {t('met execution')}
                  <span className="accent">.</span>
                </h2>
              </div>
              <div className="timeline">
                {data.experiences.length ? (
                  data.experiences.map((exp) => (
                    <article className="timeline-entry" key={exp.ID}>
                      <p className="timeline-period">{exp.Period}</p>
                      <div>
                        <h3>{exp.Title}</h3>
                        <p className="timeline-company">{exp.Company}</p>
                        <p className="timeline-description">{exp.Description}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty-note">{t('The story is still being written.')}</p>
                )}
              </div>
            </div>
          </section>
          <section className="expertise-section section-pad">
            <div className="shell content-grid">
              <div className="sticky-heading">
                <p className="section-label">{t('TOOLKIT')}</p>
                <h2>
                  {t('Skills in service')}
                  <br />
                  {t('of ideas')}
                  <span className="accent">.</span>
                </h2>
              </div>
              <SkillGroups skills={data.skills} />
            </div>
          </section>
        </>
      )}
    </>
  )
}
