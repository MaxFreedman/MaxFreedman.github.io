export default function HomePage() {
  return (
    <main className="personal-site">
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="site-wordmark" href="/">MF</a>
        <div>
          <a href="#projects">Projects</a>
          <a href="https://github.com/MaxFreedman">GitHub</a>
        </div>
      </nav>

      <section className="personal-hero">
        <div className="hero-copy">
          <span className="personal-kicker">Max Freedman</span>
          <h1>I make technical material easier to explore.</h1>
          <p>
            This is a home for experiments and tools built around recordings,
            data, and the stories hidden inside them.
          </p>
          <a className="hero-link" href="#projects">See the work <span>↓</span></a>
        </div>
        <div className="hero-signal" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <i key={index} style={{ height: `${18 + ((index * 37) % 76)}%` }} />
          ))}
        </div>
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
        <strong>Max Freedman</strong>
        <span>Projects and experiments</span>
        <a href="https://github.com/MaxFreedman">github.com/MaxFreedman</a>
      </footer>
    </main>
  );
}
