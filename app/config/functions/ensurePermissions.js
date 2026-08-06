'use strict';

/**
 * Allowlisted Strapi 3 Users & Permissions actions enabled on bootstrap
 * for the authenticated role. Actions are stored lowercased by Strapi.
 */
const AUTHENTICATED_PERMISSIONS = [
    // event
    { controller: 'event', action: 'authenticated' },
    { controller: 'event', action: 'findone' },
    { controller: 'event', action: 'update' },
    { controller: 'event', action: 'publish' },
    { controller: 'event', action: 'nonpersistentpublish' },
    { controller: 'event', action: 'republisherror' },
    { controller: 'event', action: 'republishfail' },
    { controller: 'event', action: 'republishpreconditionfail' },
    { controller: 'event', action: 'republishsingleerror' },

    // event-subscription
    { controller: 'event-subscription', action: 'find' },
    { controller: 'event-subscription', action: 'geterrors' },
    { controller: 'event-subscription', action: 'cleananomaly' },
    { controller: 'event-subscription', action: 'populatemissing' },
    { controller: 'event-subscription', action: 'markmissingaserror' },
    { controller: 'event-subscription', action: 'markasfail' },
    { controller: 'event-subscription', action: 'markassuccess' },
    { controller: 'event-subscription', action: 'marksingleassuccess' },
    { controller: 'event-subscription', action: 'recordstart' },
    { controller: 'event-subscription', action: 'recordsuccess' },
    { controller: 'event-subscription', action: 'recordfailure' },
    { controller: 'event-subscription', action: 'recordpreconditionfailure' },
    { controller: 'event-subscription', action: 'hasreachedmaxattempts' },

    // event-stats
    { controller: 'event-stats', action: 'find' },
    { controller: 'event-stats', action: 'calculate' },
    { controller: 'event-stats', action: 'calculatesingle' },
];

const PUBLIC_PERMISSIONS = [
    { controller: 'healthcheck', action: 'check' },
];

async function enablePermission(role, { controller, action }) {
    const permission = await strapi.query('permission', 'users-permissions').findOne({
        type: 'application',
        controller,
        action,
        role: role.id,
    });

    if (!permission) {
        strapi.log.warn(
            `ensurePermissions: missing permission ${controller}.${action} for role ${role.type}`
        );
        return;
    }

    if (permission.enabled) {
        return;
    }

    await strapi.query('permission', 'users-permissions').update(
        { id: permission.id },
        { enabled: true }
    );
}

async function ensureAuthenticatedPermissions() {
    const authenticated = await strapi.query('role', 'users-permissions').findOne({
        type: 'authenticated',
    });

    if (!authenticated) {
        strapi.log.warn('ensurePermissions: authenticated role not found');
    } else {
        for (const entry of AUTHENTICATED_PERMISSIONS) {
            await enablePermission(authenticated, entry);
        }
    }

    const publicRole = await strapi.query('role', 'users-permissions').findOne({
        type: 'public',
    });

    if (!publicRole) {
        strapi.log.warn('ensurePermissions: public role not found');
        return;
    }

    for (const entry of PUBLIC_PERMISSIONS) {
        await enablePermission(publicRole, entry);
    }
}

module.exports = {
    AUTHENTICATED_PERMISSIONS,
    PUBLIC_PERMISSIONS,
    ensureAuthenticatedPermissions,
    enablePermission,
};
