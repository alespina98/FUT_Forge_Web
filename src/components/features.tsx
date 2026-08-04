import { DesktopFrame } from "./desktop-frame";
import { SparkIcon } from "./icons";

const stories = [
  {
    index: "01",
    eyebrow: "SBC Solver",
    title: "Solve the challenge. Keep the value.",
    text: "Work through live squad-building challenges in a focused desktop workflow designed to make every requirement and decision easier to understand.",
    src: "/screenshots/sbc-solver.png",
    alt: "Current FUT Forge SBC Solver workspace",
    width: 1290,
    height: 756,
    points: ["Live challenge catalogue", "Requirement-first workflow", "Purpose-built desktop experience"],
  },
  {
    index: "02",
    eyebrow: "EVO Builder",
    title: "Design the player before the grind.",
    text: "Plan player evolution routes, compare outcomes, protect paid upgrades, and understand the path before committing.",
    src: "/screenshots/evolutions.png",
    alt: "Current FUT Forge EVO Builder workspace",
    width: 1400,
    height: 850,
    points: ["Player-first planning", "Path comparison", "Saved evolution routes"],
  },
];

export function Features() {
  return (
    <section id="features" className="section-shell product-stories section-reveal" data-reveal>
      <div className="story-intro">
        <div><div className="section-label"><SparkIcon className="size-4" />The current application</div><h2 className="section-title mt-5 max-w-3xl">Two essential workflows.<br /><span className="text-white/35">One focused companion.</span></h2></div>
        <p>Explore real captures from the current FUT Forge desktop application. Each interface is shown once, in the order the product story deserves.</p>
      </div>
      <div className="story-list story-journey">
        {stories.map((story, index) => (
          <article data-reveal className={`product-story story-reveal ${index % 2 ? "reverse" : ""}`} key={story.title}>
            <div className="story-copy"><span className="story-index">{story.index} / {story.eyebrow}</span><h3>{story.title}</h3><p>{story.text}</p><ul>{story.points.map((point) => <li key={point}><i />{point}</li>)}</ul></div>
            <div className="story-frame"><DesktopFrame src={story.src} alt={story.alt} label={story.eyebrow} width={story.width} height={story.height} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
