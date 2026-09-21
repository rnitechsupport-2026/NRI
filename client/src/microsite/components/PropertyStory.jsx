import { motion } from 'framer-motion';
import SectionLabel from './SectionLabel.jsx';
import ImageReveal from './ImageReveal.jsx';

export default function PropertyStory({ story }) {
  return (
    <section id="story" className="relative bg-gradient-to-b from-ink via-cream to-cream pt-24 pb-28 md:pb-36">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-6 md:grid-cols-2 md:gap-10 md:px-12 md:pt-16">
        <div className="flex flex-col justify-center">
          <SectionLabel>{story.label}</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="ms-serif mt-6 text-4xl leading-[1.15] text-ink sm:text-5xl md:text-6xl"
          >
            {story.heading}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-md whitespace-pre-line text-lg leading-relaxed text-stone"
          >
            {story.body}
          </motion.p>
        </div>

        <ImageReveal src={story.image} alt="Property architecture" className="rounded-sm md:mt-8" />
      </div>
    </section>
  );
}
