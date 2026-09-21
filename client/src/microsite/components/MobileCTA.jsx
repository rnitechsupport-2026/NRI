import { Phone, MessageCircle, CalendarDays } from 'lucide-react';

export default function MobileCTA({ phone }) {
  const digits = phone.replace(/[^\d]/g, '');

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex lg:hidden border-t border-black/5 bg-white/95 backdrop-blur-md">
      <a href={`tel:${digits}`} className="flex flex-1 flex-col items-center gap-1 py-3 text-ink">
        <Phone size={18} strokeWidth={1.6} />
        <span className="text-[11px] tracking-wide">Call</span>
      </a>
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-1 flex-col items-center gap-1 border-x border-black/5 py-3 text-ink"
      >
        <MessageCircle size={18} strokeWidth={1.6} />
        <span className="text-[11px] tracking-wide">WhatsApp</span>
      </a>
      <button
        onClick={() => document.getElementById('visit')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex flex-1 flex-col items-center gap-1 bg-ink py-3 text-white"
      >
        <CalendarDays size={18} strokeWidth={1.6} />
        <span className="text-[11px] tracking-wide">Visit</span>
      </button>
    </div>
  );
}
