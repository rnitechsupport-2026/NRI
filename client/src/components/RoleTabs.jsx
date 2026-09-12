import { User, Search, Briefcase, Building, Wrench } from './Icons.jsx';

/**
 * The BUYER / OWNER / AGENT / BUILDER / SERVICES selector used on the login,
 * register and "post property" screens.
 */
export const ROLES = [
  {
    key: 'buyer',
    label: 'Buyer',
    icon: Search,
    title: 'Property Buyer / Renter',
    blurb: 'Browse verified listings, shortlist your favourites and enquire directly with owners, agents and builders — no middleman.',
    perks: ['Shortlist your favourites', 'Track every enquiry', 'Personalised recommendations'],
  },
  {
    key: 'owner',
    label: 'Owner',
    icon: User,
    title: 'Property Owner',
    blurb: 'List your own flat, house, plot or commercial space and talk to buyers directly — zero brokerage.',
    perks: ['Post unlimited properties', 'Direct buyer enquiries', 'Shortlist & compare'],
  },
  {
    key: 'agent',
    label: 'Agent',
    icon: Briefcase,
    title: 'Real Estate Agent',
    blurb: 'Manage your entire inventory, capture leads and close faster with a RERA verified profile.',
    perks: ['Bulk listing management', 'Lead pipeline & status', 'Verified agent badge'],
  },
  {
    key: 'builder',
    label: 'Builder',
    icon: Building,
    title: 'Builder / Developer',
    blurb: 'Showcase your projects with floor plans, 3D walkthroughs and pricing — reach serious buyers.',
    perks: ['Project microsites', 'Unit & inventory tracking', 'Featured placement'],
  },
  {
    key: 'service',
    label: 'Services',
    icon: Wrench,
    title: 'Service Partner',
    blurb: 'Interiors, legal, home loan, packers & movers — get discovered by home buyers who need you.',
    perks: ['Service listings', 'Direct customer leads', 'Ratings & reviews'],
  },
];

export const roleInfo = (key) => ROLES.find((r) => r.key === key) || ROLES[0];

export default function RoleTabs({ value, onChange, className = '' }) {
  return (
    <div className={`role-tabs ${className}`} role="tablist" aria-label="Account type">
      {ROLES.map((r) => {
        const Icon = r.icon;
        const on = value === r.key;
        return (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={on}
            className={`role-tab ${on ? 'on' : ''}`}
            onClick={() => onChange(r.key)}
          >
            <Icon />
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
