"use client";

import { DesktopFrame } from "./desktop-frame";
import { SparkIcon } from "./icons";
import { useI18n } from "./i18n-provider";

const captures = [
  { src: "/screenshots/sbc-solver.png", width: 1571, height: 782 },
  { src: "/screenshots/evolutions.png", width: 1456, height: 792 },
] as const;

export function Features() {
  const { t } = useI18n();

  return (
    <section id="features" className="section-shell product-stories section-reveal" data-reveal>
      <div className="story-intro">
        <div><div className="section-label"><SparkIcon className="size-4" />{t.features.label}</div><h2 className="section-title mt-5 max-w-3xl">{t.features.title}<br /><span className="text-white/35">{t.features.titleMuted}</span></h2></div>
        <p>{t.features.intro}</p>
      </div>
      <div className="story-list story-journey">
        {t.features.stories.map((story, index) => (
          <article data-reveal className={`product-story story-reveal ${index % 2 ? "reverse" : ""}`} key={story.eyebrow}>
            <div className="story-copy"><span className="story-index">0{index + 1} / {story.eyebrow}</span><h3>{story.title}</h3><p>{story.text}</p><ul>{story.points.map((point) => <li key={point}><i />{point}</li>)}</ul></div>
            <div className="story-frame"><DesktopFrame src={captures[index].src} alt={story.alt} label={story.eyebrow} width={captures[index].width} height={captures[index].height} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
