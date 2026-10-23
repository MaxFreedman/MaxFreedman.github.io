import "./home.css";

const projects = [
  {
    number: "01",
    name: "MB4X Radio Archive",
    type: "Contest log & audio",
    description:
      "The MB4X log from the 2026 IARU HF Championship, with 4,606 contacts and the station's stereo audio recording. Find a QSO, cue the recording, and listen to each radio separately.",
    note: "4,606 QSOs · 24 hours of audio",
    href: "/projects/mb4x-radio-archive/",
    linkText: "Explore the archive",
  },
  {
    number: "02",
    name: "ExpeditionOps",
    type: "DXpedition planning",
    description:
      "A tool for the part of a DXpedition that happens before the pileups: equipment lists, baggage assignments, travel details, and all the little things that need to arrive together.",
    note: "Browser demo · Data stays on your device",
    href: "/projects/expeditionops/",
    linkText: "Try the demo",
  },
];

export default function HomePage() {
  return (
    <div className="n4-home">
      <a className="n4-skip" href="#content">Skip to content</a>

      <header className="n4-header">
        <div className="n4-container n4-header-inner">
          <a className="n4-brand" href="/" aria-label="Max Freedman, N4ML — home">
            <strong>N4ML</strong>
            <span>Max Freedman</span>
          </a>
          <nav className="n4-nav" aria-label="Main navigation">
            <a href="#projects">Projects</a>
            <a href="#about">About</a>
            <a href="#elsewhere">Elsewhere</a>
          </nav>
        </div>
      </header>

      <main id="content" tabIndex={-1}>
        <section className="n4-hero n4-container" aria-labelledby="intro-title">
          <div className="n4-hero-copy">
            <p className="n4-overline">Amateur radio / N4ML</p>
            <h1 id="intro-title">Hi, I&apos;m Max.</h1>
            <p className="n4-lede">
              I&apos;m an amateur radio operator who likes contests, ambitious
              DXpeditions, and building things that make radio projects easier.
            </p>
            <p className="n4-hero-detail">
              This is a place for the projects I&apos;ve made, the things I&apos;ve
              learned, and whatever I&apos;m working on next.
            </p>
            <a className="n4-text-link" href="#projects">See what I&apos;ve built <span aria-hidden="true">↓</span></a>
          </div>

          <aside className="n4-hero-aside" aria-label="A few things about me">
            <div className="n4-call-sign">N4ML<span className="n4-call-period">.</span></div>
            <p>Licensed since 2016</p>
            <dl>
              <div>
                <dt>On the air</dt>
                <dd>Contesting, DX, remote operating</dd>
              </div>
              <div>
                <dt>At work</dt>
                <dd>Education &amp; learning at ARRL</dd>
              </div>
              <div>
                <dt>Also</dt>
                <dd>Director, NCDXF</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="n4-projects n4-container" id="projects" aria-labelledby="projects-title">
          <div className="n4-section-heading">
            <div>
              <p className="n4-overline">01 / Projects</p>
              <h2 id="projects-title">Things I&apos;ve made.</h2>
            </div>
            <p>Mostly radio-related. All built to solve a real problem or explore an interesting one.</p>
          </div>
          <div className="n4-project-list">
            {projects.map((project) => (
              <article className="n4-project" key={project.number}>
                <span className="n4-project-number" aria-hidden="true">{project.number}</span>
                <div className="n4-project-body">
                  <p className="n4-project-type">{project.type}</p>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <span className="n4-project-note">{project.note}</span>
                </div>
                <a className="n4-project-link" href={project.href} aria-label={`${project.linkText}: ${project.name}`}>
                  {project.linkText} <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="n4-about" id="about" aria-labelledby="about-title">
          <div className="n4-container n4-about-grid">
            <div>
              <p className="n4-overline">02 / About</p>
              <h2 id="about-title">A little background.</h2>
            </div>
            <div className="n4-about-copy">
              <p>
                I got my amateur radio license in 2016. Since then, radio has taken me
                into contest stations, classrooms, and expedition planning meetings.
                I&apos;ve been involved with WRTC and the 3Y0K Bouvet Island expedition,
                and I serve as a director of the Northern California DX Foundation.
              </p>
              <p>
                My day job is in education and learning at ARRL. I work on resources
                for instructors and students, and on making it easier for someone to
                get started in amateur radio and find their next challenge.
              </p>
              <p>
                Off the air, I cook, fish, and camp. I also have a bad habit of
                turning something that could have been a spreadsheet into its own
                software project.
              </p>
            </div>
          </div>
        </section>

        <section className="n4-elsewhere n4-container" id="elsewhere" aria-labelledby="elsewhere-title">
          <div>
            <p className="n4-overline">03 / Elsewhere</p>
            <h2 id="elsewhere-title">Find me around.</h2>
          </div>
          <div className="n4-links">
            <a href="https://github.com/MaxFreedman">GitHub <span aria-hidden="true">↗</span></a>
            <a href="https://www.arrl.org/meet-the-education-staff">ARRL <span aria-hidden="true">↗</span></a>
            <a href="https://www.ncdxf.org/">NCDXF <span aria-hidden="true">↗</span></a>
            <a href="mailto:max@n4ml.net">Email me <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>

      <footer className="n4-footer">
        <div className="n4-container n4-footer-inner">
          <span>© {new Date().getFullYear()} Max Freedman · N4ML</span>
          <span>73, and thanks for stopping by.</span>
        </div>
      </footer>
    </div>
  );
}
