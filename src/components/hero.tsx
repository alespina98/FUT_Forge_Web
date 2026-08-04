import { Arrow, DownloadIcon, SparkIcon } from "./icons";

const trust = ["Real Windows application", "Runs on your desktop", "Community-first development"];

export function Hero() {
  return (
    <section id="top" className="hero-grid hero-v2 relative px-4 pb-24 pt-36 sm:px-6 sm:pt-44 lg:pb-36">
      <div className="hero-noise" />
      <div className="hero-orb hero-orb-primary" />
      <div className="hero-orb hero-orb-secondary" />
      <div className="hero-scan" />
      <div className="relative mx-auto max-w-7xl text-center">
        <div className="hero-release reveal"><span className="live-dot" /><SparkIcon className="size-4" /><span>FUT Forge Desktop 2.10</span><i />The desktop era has arrived</div>
        <h1 className="hero-title hero-title-v2 mx-auto mt-9 max-w-[1180px] text-balance font-semibold">
          <span className="hero-line hero-line-build"><span className="line-index">01</span>BUILD</span>
          <span className="hero-line hero-line-optimize"><span className="line-index">02</span>OPTIMIZE</span>
          <span className="hero-line hero-line-dominate"><span className="line-index">03</span><span className="text-gradient">DOMINATE</span></span>
        </h1>
        <div className="hero-message reveal delay-2"><p>The future of Ultimate Team is not another browser tab.</p><p>It is a dedicated command center built to turn every decision into an advantage.</p></div>
        <div className="hero-actions reveal delay-3">
          <a href="#download" className="button-primary hero-primary magnetic"><DownloadIcon className="size-5" /><span><b>Get FUT Forge</b><small>Windows 10 &amp; 11</small></span><span className="button-chip">FREE</span></a>
          <a href="#features" className="button-secondary hero-secondary magnetic"><span><b>See the real application</b><small>Explore every workflow</small></span><Arrow className="size-5" /></a>
        </div>
        <div className="hero-trust reveal delay-4">{trust.map((item, index) => <span key={item}><i className={index === 0 ? "active" : ""} />{item}</span>)}</div>
        <div className="hero-proof reveal"><div><strong>12K+</strong><span>player profiles</span></div><i /><div><strong>35</strong><span>advanced attributes</span></div><i /><div><strong>Live</strong><span>SBC catalogue</span></div><i /><div><strong>&lt; 50ms</strong><span>local response</span></div></div>
      </div>
    </section>
  );
}
