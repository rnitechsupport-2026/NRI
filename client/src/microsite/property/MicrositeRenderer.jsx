import '../microsite.css';
import { SECTION_REGISTRY } from './registry.js';
import { resolveTheme } from './theme.js';
import MicrositeNavbar from './MicrositeNavbar.jsx';

/**
 * The one renderer shared by template previews, the drag-and-drop builder's
 * live canvas, and the published public page. It reads the property once and
 * paints whichever sections/theme/navbar it's handed — swapping those is the
 * only thing that should ever change the output (see registry.js).
 */
export default function MicrositeRenderer({ property, sections = [], theme: themeInput, navbar = {}, className = '' }) {
  if (!property) return null;
  const theme = resolveTheme(themeInput);
  const visible = sections.filter((s) => s.isVisible !== false).sort((a, b) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0));

  return (
    <div className={`ms-root ${className}`} style={theme.cssVars}>
      <MicrositeNavbar property={property} navbar={navbar} theme={theme} />
      {visible.map((s, i) => {
        const entry = SECTION_REGISTRY[s.sectionType];
        if (!entry) return null;
        const Comp = entry.component;
        return (
          <Comp
            key={s.id || `${s.sectionType}-${i}`}
            property={property}
            data={s.sectionData || {}}
            settings={s.settings || {}}
            theme={theme}
          />
        );
      })}
    </div>
  );
}
