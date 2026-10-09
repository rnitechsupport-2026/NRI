// Who a staff member may see and act on — the one place that answers it.
//
//   admin     everything.
//   employee  only the users assigned to them, in either of two ways:
//             · by type  — `managedPortals` (e.g. ['owner'] = every Owner user)
//             · by name  — `assignedUsers`  (specific users, of any managed role)
//             and, through those users, their properties, projects, services,
//             leads, microsites, plot maps and documents. Nothing else.
//
// Every admin/employee route goes through these helpers, so changing an id in
// a URL or request body can never reach a user outside the assignment.
const User = require('../models/User');
const { HttpError } = require('../utils/helpers');

/** The user types an employee can be put in charge of. Buyers are not managed
 *  users — a buyer's interest reaches the staff as a Lead. */
const MANAGED_ROLES = ['owner', 'agent', 'builder', 'service'];
/** What an admin may browse (buyer accounts included, admin only). */
const ADMIN_PORTALS = [...MANAGED_ROLES, 'buyer'];

/** The password every new (or reset) employee account starts with. */
const DEFAULT_EMPLOYEE_PASSWORD = 'Nri@321';

const isStaff = (user) => !!user && (user.role === 'admin' || user.role === 'employee');
const idList = (ids = []) => ids.map(String);

/** May `staff` see / act on `target` (a user doc with at least _id and role)? */
function canManage(staff, target) {
  if (!staff || !target) return false;
  if (staff.role === 'admin') return true;
  if (staff.role !== 'employee') return false;
  if (!MANAGED_ROLES.includes(target.role)) return false;
  return (staff.managedPortals || []).includes(target.role) || idList(staff.assignedUsers).includes(String(target._id));
}

function assertCanManage(staff, target) {
  if (!target) throw new HttpError(404, 'User not found');
  if (!canManage(staff, target)) throw new HttpError(403, 'This user is not assigned to you');
}

/** Same check when only the user's id is known. Returns the loaded user. */
async function assertCanManageId(staff, userId, select = 'role') {
  const target = /^[0-9a-fA-F]{24}$/.test(String(userId)) ? await User.findById(userId).select(select).lean() : null;
  assertCanManage(staff, target);
  return target;
}

/** canManage for callers that must not throw (public routes with an optional login). */
async function managesUserId(staff, userId) {
  if (!isStaff(staff)) return false;
  if (staff.role === 'admin') return true;
  const target = await User.findById(userId).select('role').lean();
  return canManage(staff, target);
}

/**
 * Mongo filter on the User collection for everyone `staff` manages, optionally
 * narrowed to one user type. Throws when the type is not theirs, or when
 * nothing at all has been assigned yet.
 */
function managedUserQuery(staff, portal) {
  if (staff.role === 'admin') {
    if (portal && !ADMIN_PORTALS.includes(portal)) throw new HttpError(400, 'Invalid portal');
    return { role: portal || { $in: ADMIN_PORTALS } };
  }

  if (portal && !MANAGED_ROLES.includes(portal)) throw new HttpError(400, 'Invalid portal');
  const types = (staff.managedPortals || []).filter((p) => MANAGED_ROLES.includes(p));
  const ids = staff.assignedUsers || [];
  if (!types.length && !ids.length) throw new HttpError(403, 'No users are assigned to your account yet');

  if (portal) {
    // The whole type is theirs, or only the named users of that type are.
    return types.includes(portal) ? { role: portal } : { role: portal, _id: { $in: ids } };
  }
  return { $or: [{ role: { $in: types } }, { _id: { $in: ids }, role: { $in: MANAGED_ROLES } }] };
}

/** A user type an employee has nobody in is refused outright — not answered
 *  with an empty list — so "not yours" is unmistakable. */
async function assertPortalAccess(staff, portal) {
  if (!portal || staff.role === 'admin') return;
  if (!(await scopePortals(staff)).includes(portal)) throw new HttpError(403, 'You are not in charge of this user type');
}

async function managedUserIds(staff, portal) {
  await assertPortalAccess(staff, portal);
  const rows = await User.find(managedUserQuery(staff, portal)).select('_id').lean();
  return rows.map((u) => u._id);
}

/** The user types an employee has anyone in — drives which pages they see. */
async function scopePortals(staff) {
  if (!staff) return [];
  if (staff.role === 'admin') return MANAGED_ROLES;
  if (staff.role !== 'employee') return [];
  const types = (staff.managedPortals || []).filter((p) => MANAGED_ROLES.includes(p));
  const ids = staff.assignedUsers || [];
  const named = ids.length ? await User.distinct('role', { _id: { $in: ids }, role: { $in: MANAGED_ROLES } }) : [];
  return MANAGED_ROLES.filter((p) => types.includes(p) || named.includes(p));
}

/** Everyone who should hear about something `user` needs reviewed: admins,
 *  plus the employees that user is assigned to. */
function reviewersFor(user) {
  return User.find({
    status: 'active',
    $or: [
      { role: 'admin' },
      { role: 'employee', managedPortals: user.role },
      { role: 'employee', assignedUsers: user._id },
    ],
  }).select('_id').lean();
}

module.exports = {
  MANAGED_ROLES, ADMIN_PORTALS, DEFAULT_EMPLOYEE_PASSWORD, isStaff,
  canManage, assertCanManage, assertCanManageId, managesUserId,
  managedUserQuery, managedUserIds, assertPortalAccess, scopePortals, reviewersFor,
};
