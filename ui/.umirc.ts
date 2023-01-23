import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: false,
  routes: [
    {
        name: 'Event Manager',
        path: '/',
        component: './Home',
    },
  ],
  npmClient: 'yarn',
  locale: {
    default: 'en-US'
  },
  scripts: ['/globals.js'],
  styles: ['/main.css']
});

