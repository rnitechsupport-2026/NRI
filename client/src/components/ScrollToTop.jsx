import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Router keeps scroll position between pages otherwise. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}
