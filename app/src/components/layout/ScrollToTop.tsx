import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return <Outlet />;
}
