import { motion } from 'framer-motion';
import { ArrowRight, Phone } from '../../../components/Icons.jsx';
import { priceLabel, money, rupees } from '../../../utils/format.js';
import { priceDisplay } from '../theme.js';
import Section from '../Section.jsx';
import ThemedButton from '../ThemedButton.jsx';
import { Stagger, StaggerItem, EASE } from '../motion.jsx';

export default function Pricing({ anchorId = 'ms-pricing', property: p, data = {}, settings = {} }) {
  const tone = settings.tone || 'dark';
  const price = priceDisplay(p, priceLabel, money);
  const perArea = p.built_up_area && !p.price_range ? `${rupees(Math.round(p.price / p.built_up_area))} / ${p.area_unit}` : null;

  return (
    <Section id={anchorId} tone={tone} width="max-w-4xl" className="text-center">
      <Stagger className="flex flex-col items-center gap-5">
        <StaggerItem as="span" className="ms-eyebrow">{data.heading || 'Price'}</StaggerItem>

        {/* the number is the whole point of this section — it arrives last and largest */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 30, scale: 0.92 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.1, ease: EASE } } }}
          className="ms-display ms-accent font-bold"
          style={{ fontSize: 'clamp(2.8rem, 1.2rem + 8vw, 7rem)', lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          {price.main}
        </motion.div>
        {price.suffix && <StaggerItem className="ms-muted -mt-2 text-lg">{price.suffix}</StaggerItem>}

        {(perArea || p.price_negotiable) && (
          <StaggerItem className="flex flex-wrap justify-center gap-2">
            {perArea && <span className="ms-chip">{perArea}</span>}
            {p.price_negotiable && <span className="ms-chip">Negotiable</span>}
          </StaggerItem>
        )}

        <StaggerItem className="mt-4 flex flex-wrap justify-center gap-3">
          <ThemedButton href="#ms-enquiry" icon={ArrowRight}>{data.buttonText || 'Enquire Now'}</ThemedButton>
          {p.owner_phone && <ThemedButton variant="secondary" href={`tel:${p.owner_phone}`} icon={Phone}>Call</ThemedButton>}
        </StaggerItem>
      </Stagger>
    </Section>
  );
}
