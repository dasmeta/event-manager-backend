'use strict';

const _ = require('lodash');
const axios = require('axios');

module.exports = async (ctx, next) => {
  let role;

  if (ctx.state.user) {
    // request is already authenticated in a different way
    return next();
  }

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const remoteUser = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx);
      const isAdmin = remoteUser.isAdmin || false;

      const { id, role, guid} = remoteUser;
      if (id === undefined /* || guid === undefined */) {
        throw new Error('Invalid token: Token did not contain required fields');
      }

      if(role) {
        if (role.type === 'root') {
          ctx.state.user = remoteUser;
          return await next();
        }
  
        if (strapi.config.custom.AUTHENTICATION_IS_LIVE_MODE) {
          // fetch authenticated user from centralized service.
          ctx.state.user = (await axios.get(strapi.config.custom.AUTHENTICATION_SERVICE_API_HOST + '/users/me', {
            headers: {
              'Authorization': ctx.request.header.authorization
            }
          })).data;
        } {
          ctx.state.user = remoteUser;
        }
      } else {
        if (isAdmin) {
          ctx.state.admin = await strapi
          .query("administrator", "admin")
          .findOne({ id });
        } else {
          ctx.state.user = await strapi
          .query("user", "users-permissions")
          .findOne({ id });
        }
      }

      // fetch authenticated user
      ctx.state.user = await strapi.plugins[
        'users-permissions'
      ].services.user.fetchAuthenticatedUser(id);

    } catch (err) {
      return handleErrors(ctx, err, 'unauthorized');
    }

    if (!ctx.state.user) {
      return handleErrors(ctx, 'User Not Found', 'unauthorized');
    }

    role = ctx.state.user.role;

    if (role.type === 'root') {
      return await next();
    }

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    if (
      _.get(await store.get({ key: 'advanced' }), 'email_confirmation') &&
      !ctx.state.user.confirmed
    ) {
      return handleErrors(ctx, 'Your account email is not confirmed.', 'unauthorized');
    }

    if (ctx.state.user.blocked) {
      return handleErrors(
        ctx,
        'Your account has been blocked by the administrator.',
        'unauthorized'
      );
    }
  }

  // Retrieve `public` role.
  if (!role) {
    role = await strapi.query('role', 'users-permissions').findOne({ type: 'public' }, []);
  }

  const route = ctx.request.route;
  const permission = await strapi.query('permission', 'users-permissions').findOne(
    {
      'role.type': role.type,
      'role.name': role.name,
      type: route.plugin || 'application',
      controller: route.controller,
      action: route.action,
      enabled: true,
    },
    []
  );

  if (!permission) {
    return handleErrors(ctx, undefined, 'forbidden');
  }

  // Execute the policies.
  if (permission.policy) {
    return await strapi.plugins['users-permissions'].config.policies[permission.policy](ctx, next);
  }

  // Execute the action.
  await next();
};

const handleErrors = (ctx, err = undefined, type) => {
  throw strapi.errors[type](err);
};
