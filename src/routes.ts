import { Contracts } from './components';
import { Route } from './models/route.models';

export let routes: Route[] = [
  {
    route: '/contracts',
    method: 'GET',
    component: Contracts,
    action: 'get',
  },
  {
    route: '/contracts',
    method: 'POST',
    component: Contracts,
    action: 'set',
  },
  {
    route: '/contracts',
    method: 'POST',
    component: Contracts,
    action: 'updateCache',
  },
];
