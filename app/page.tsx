export default function HomePage() {
  return (
    <main className="personal-site">
      <a className="skip-link" href="#about">Skip to content</a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="site-wordmark" href="/" aria-label="Max Freedman home">MF<span className="wordmark-dot" /></a>
        <div>
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="https://github.com/MaxFreedman">GitHub</a>
        </div>
      </nav>

      <section className="personal-hero">
        <div className="hero-copy">
          <span className="personal-kicker">Max Freedman / N4ML</span>
          <h1>Radio, faraway places, and overly specific software.</h1>
          <p>
            I&apos;m Max. I work in amateur-radio education, operate contests,
            and build small tools for things that don&apos;t quite have tools yet.
          </p>
          <div className="hero-actions">
            <a className="hero-link" href="#projects">Explore the projects <span aria-hidden="true">↗</span></a>
            <a className="hero-secondary" href="#about">A little about me <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-signal" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <i key={index} style={{ height: `${18 + ((index * 37) % 76)}%`, animationDelay: `${index * -0.13}s` }} />
          ))}
          <span>N4ML</span>
        </div>
      </section>

      <section className="tooling-note" aria-labelledby="tooling-note-title">
        <div>
          <span className="personal-kicker">A note before we continue</span>
          <h2 id="tooling-note-title">A workshop with modern tooling.</h2>
        </div>
        <p>
          I bring the source material, questions, opinions, and final calls.
          Modern tooling helps with the code, design, writing, and analysis. Think of this
          as a public workshop: a place to try things, learn, and keep building.
        </p>
      </section>

      <section className="about-section" id="about">
        <div className="about-heading">
          <span className="personal-kicker">A short version</span>
          <h2>Hello. I&apos;m Max.</h2>
        </div>
        <div className="about-copy">
          <p className="about-lede">
            I&apos;ve been an amateur-radio operator since 2016. My callsign is
            N4ML, and I&apos;m happiest when radio turns into a mix of competition,
            travel, engineering, and people solving odd problems together.
          </p>
          <p>
            Radio has taken me from classrooms and contest stations to WRTC
            and the 3Y0K Bouvet Island expedition—which still feels like a
            sentence somebody else wrote. I&apos;m also a director of the Northern
            California DX Foundation.
          </p>
          <p>
            I like how modern technology changes what an expedition can look
            like before anyone gets on a plane. Good software, reliable
            communications, remote collaboration, and automation help teams
            spread across the world plan complex logistics, stay coordinated
            in the field, and carry out ambitious operations with better
            information on hand.
          </p>
          <p>
            For work, I support education and learning at ARRL: keeping
            learning resources useful, helping instructors, and getting more
            radio into classrooms. Away from a station, I cook, fish, camp,
            and occasionally convince myself that a very specific problem
            needs its own web app.
          </p>
          <div className="about-links">
            <a href="https://www.arrl.org/meet-the-education-staff">ARRL profile ↗</a>
            <a href="https://github.com/MaxFreedman">GitHub ↗</a>
            <a href="https://www.ncdxf.org/">NCDXF ↗</a>
          </div>
        </div>
        <aside className="about-facts" aria-label="Quick facts">
          <div><span>Callsign</span><strong>N4ML</strong></div>
          <div><span>Day job</span><strong>Amateur-radio education</strong></div>
          <div><span>Usually doing</span><strong>Contesting, DXing, building</strong></div>
          <div><span>This website</span><strong>Exploring modern tooling</strong></div>
        </aside>
      </section>

      <section className="project-section" id="projects">
        <div className="project-heading">
          <div>
            <span className="personal-kicker">Selected project</span>
            <h2>Listen through the log.</h2>
          </div>
          <span className="project-number">01</span>
        </div>

        <a className="project-card" href="/projects/mb4x-radio-archive/">
          <div className="project-visual" aria-hidden="true">
            <div className="project-mark">MB<span>4</span>X</div>
            <div className="project-wave radio-zero" />
            <div className="project-wave radio-one" />
          </div>
          <div className="project-copy">
            <span className="project-tag">Interactive archive · Amateur radio</span>
            <h3>MB4X Radio Archive</h3>
            <p>
              Explore 4,606 WRTC contest contacts alongside a synchronized
              24-hour stereo field recording, with each radio isolated by channel.
            </p>
            <dl>
              <div><dt>Contacts</dt><dd>4,606</dd></div>
              <div><dt>Audio</dt><dd>24 hours</dd></div>
              <div><dt>Radios</dt><dd>2 channels</dd></div>
            </dl>
            <span className="project-cta">Open the archive <b>↗</b></span>
          </div>
        </a>
      </section>

      <footer className="personal-footer">
        <strong>Max Freedman / N4ML</strong>
        <span>Radio, projects, and modern tooling</span>
        <a href="https://github.com/MaxFreedman">github.com/MaxFreedman</a>
      </footer>
    </main>
  );
}
