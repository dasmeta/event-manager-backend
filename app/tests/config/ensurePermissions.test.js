'use strict';

const {
    ensureAuthenticatedPermissions,
    AUTHENTICATED_PERMISSIONS,
    PUBLIC_PERMISSIONS,
} = require('../../config/functions/ensurePermissions');

describe('ensureAuthenticatedPermissions', () => {
    let permissions;
    let roles;
    let updateMock;

    beforeEach(() => {
        updateMock = jest.fn().mockResolvedValue({});
        permissions = [];
        roles = {
            authenticated: { id: 1, type: 'authenticated' },
            public: { id: 2, type: 'public' },
        };

        strapi.query = jest.fn((model, plugin) => {
            if (model === 'role' && plugin === 'users-permissions') {
                return {
                    findOne: async ({ type }) => roles[type] || null,
                };
            }
            if (model === 'permission' && plugin === 'users-permissions') {
                return {
                    findOne: async (query) => {
                        return permissions.find(
                            (p) =>
                                p.controller === query.controller &&
                                p.action === query.action &&
                                p.role === query.role &&
                                p.type === query.type
                        ) || null;
                    },
                    update: updateMock,
                };
            }
            return {};
        });
    });

    it('enables allowlisted authenticated permissions that are disabled', async () => {
        permissions = AUTHENTICATED_PERMISSIONS.map((entry, idx) => ({
            id: idx + 1,
            type: 'application',
            controller: entry.controller,
            action: entry.action,
            role: 1,
            enabled: false,
        }));

        await ensureAuthenticatedPermissions();

        expect(updateMock).toHaveBeenCalled();
        expect(updateMock.mock.calls.every(([, data]) => data.enabled === true)).toBe(true);
        expect(updateMock).toHaveBeenCalledTimes(AUTHENTICATED_PERMISSIONS.length);
    });

    it('skips already enabled allowlisted permissions', async () => {
        permissions = AUTHENTICATED_PERMISSIONS.map((entry, idx) => ({
            id: idx + 1,
            type: 'application',
            controller: entry.controller,
            action: entry.action,
            role: 1,
            enabled: true,
        }));

        // public healthcheck also enabled
        permissions.push({
            id: 999,
            type: 'application',
            controller: 'healthcheck',
            action: 'check',
            role: 2,
            enabled: true,
        });

        await ensureAuthenticatedPermissions();
        expect(updateMock).not.toHaveBeenCalled();
    });

    it('does not enable non-allowlisted application permissions', async () => {
        permissions = [
            {
                id: 1,
                type: 'application',
                controller: 'event-archive',
                action: 'find',
                role: 1,
                enabled: false,
            },
            {
                id: 2,
                type: 'application',
                controller: 'event',
                action: 'publish',
                role: 1,
                enabled: false,
            },
        ];

        await ensureAuthenticatedPermissions();

        const updatedIds = updateMock.mock.calls.map(([query]) => query.id);
        expect(updatedIds).toContain(2);
        expect(updatedIds).not.toContain(1);
    });

    it('enables public healthcheck and leaves other public untouched', async () => {
        permissions = [
            {
                id: 10,
                type: 'application',
                controller: 'healthcheck',
                action: 'check',
                role: 2,
                enabled: false,
            },
            {
                id: 11,
                type: 'application',
                controller: 'event',
                action: 'find',
                role: 2,
                enabled: false,
            },
        ];

        await ensureAuthenticatedPermissions();

        const updatedIds = updateMock.mock.calls.map(([query]) => query.id);
        expect(updatedIds).toContain(10);
        expect(updatedIds).not.toContain(11);
        expect(PUBLIC_PERMISSIONS).toEqual([{ controller: 'healthcheck', action: 'check' }]);
    });

    it('warns and does not throw when permission row is missing', async () => {
        permissions = [];
        await expect(ensureAuthenticatedPermissions()).resolves.toBeUndefined();
        expect(strapi.log.warn).toHaveBeenCalled();
        expect(updateMock).not.toHaveBeenCalled();
    });
});
