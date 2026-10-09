// The three verification states, worded the same way everywhere they appear —
// on a user's account and on a property, in the staff screens and in the
// lister's own dashboard.
export const APPROVAL = {
  pending: { key: 'pending', label: 'Under Verification', cls: 'badge-amber' },
  approved: { key: 'approved', label: 'Approved', cls: 'badge-green' },
  rejected: { key: 'rejected', label: 'Rejected', cls: 'badge-red' },
};

/** A property's verification state from its status: `pending` and `rejected`
 *  are themselves; every other status (active, paused, sold, rented) only
 *  exists after approval. */
export function propertyReview(status) {
  if (status === 'pending') return APPROVAL.pending;
  if (status === 'rejected') return APPROVAL.rejected;
  return APPROVAL.approved;
}
