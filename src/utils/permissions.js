export const checkPermission = (user, moduleName) => {
    if (!user) return 'no_access';

    // Global Admin / Full Control override
    // Global Admin / Full Control override
    // We rely on 'permission' field now, so even Owners can be restricted if needed
    const userPerm = user.permission ? user.permission.trim() : '';

    if (userPerm === 'full_control') {
        return 'full_control';
    }

    // Global Data Entry override
    if (userPerm === 'data_entry') {
        return 'data_entry';
    }

    // Module specific permission
    const modulePerm = user.modulePermissions?.[moduleName];

    // Explicit 'no_access' check
    if (modulePerm === 'no_access') return 'no_access';

    // Default to 'view_only' if not specified (unless explicitly 'no_access')
    if (!modulePerm) return 'view_only';
    return modulePerm;
};

export const canEnterData = (permission) => {
    return permission === 'data_entry' || permission === 'full_control';
};

export const canEditDelete = (permission, itemCreatedAt = null) => {
    if (permission === 'full_control') return true;

    // Strict Rule: Data Entry users cannot edit or delete.
    if (permission === 'data_entry') return false;

    return false;
};
