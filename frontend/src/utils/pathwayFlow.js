export function getCandidateNextRoute(dashboard) {
  const next = dashboard?.nextRoute;
  if (typeof next === 'string' && next.startsWith('/')) {
    return next;
  }
  return '/candidate-dashboard';
}
