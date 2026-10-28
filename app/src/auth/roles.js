/** Ordered from least to most rights; every role inherits the rights of the roles before it. */
export const ROLES = ['user', 'mapper', 'maintainer', 'admin'];

export const hasRole = (user, minRole) => !!user && ROLES.indexOf(user.role) >= ROLES.indexOf(minRole);

/** Owners manage their own pins/routes; admins manage everything. */
export const canEdit = (user, row) => !!user && (user.role === 'admin' || row.owner_id === user.id);
