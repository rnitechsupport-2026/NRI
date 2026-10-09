import { useLocation } from 'react-router-dom';

/**
 * The staff review screens (assigned users, a user's details, property
 * verification, applications, leads, history) are one set of pages shown in
 * two places: the admin's dashboard and the Employee Portal. Their links to
 * each other must stay inside whichever one they are open in — this is the
 * prefix to build them from.
 */
export function useStaffBase() {
  return useLocation().pathname.startsWith('/staff') ? '/staff' : '/dashboard/admin';
}
