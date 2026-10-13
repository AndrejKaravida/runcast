self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || 'RunCast';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requested = (event.notification.data && event.notification.data.url) || '/';
  const url =
    typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const client = windowClients.find((item) => 'focus' in item);
      if (client) {
        client.navigate(url);
        return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
