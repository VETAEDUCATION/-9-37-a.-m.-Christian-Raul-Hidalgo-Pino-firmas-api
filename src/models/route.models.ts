
export interface Route {
    route: string;
    method: 'POST' | 'GET' | 'DELETE' | 'PUT';
    component: { new(): any };
    action: string;
  }
  