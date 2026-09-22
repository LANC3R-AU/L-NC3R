const CACHE_NAME = "lanc3r-garage-v5";

const APP_SHELL = [
    "/L-NC3R/garage.html",
    "/L-NC3R/manifest.json",
    "/L-NC3R/icons/icon-192.png",
    "/L-NC3R/icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        Promise.all([
            caches.keys().then(names =>
                Promise.all(
                    names
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                )
            ),
            self.clients.claim()
        ])
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    const isNavigation =
        request.mode === "navigate" ||
        request.destination === "document" ||
        url.pathname.endsWith("/garage.html");

    if (isNavigation) {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});


/* =========================
   NOTIFICATION CLICK
========================= */

self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl =
        event.notification.data?.url ||
        "/L-NC3R/garage.html";

    event.waitUntil(
        clients
            .matchAll({
                type: "window",
                includeUncontrolled: true
            })
            .then(windowClients => {

                for (const client of windowClients) {
                    const clientUrl =
                        new URL(client.url);

                    if (
                        clientUrl.pathname.startsWith(
                            "/L-NC3R/"
                        )
                    ) {
                        return client
                            .focus()
                            .then(() =>
                                client.navigate(targetUrl)
                            );
                    }
                }

                return clients.openWindow(targetUrl);
            })
    );
});


/* =========================
   NETWORK FIRST
========================= */

async function networkFirst(request) {
    try {
        const freshRequest =
            new Request(
                request,
                {
                    cache: "no-store"
                }
            );

        const response =
            await fetch(freshRequest);

        if (
            response &&
            response.ok
        ) {
            const cache =
                await caches.open(
                    CACHE_NAME
                );

            await cache.put(
                request,
                response.clone()
            );
        }

        return response;

    } catch (error) {

        const cached =
            await caches.match(request);

        if (cached) {
            return cached;
        }

        throw error;
    }
}


/* =========================
   STALE WHILE REVALIDATE
========================= */

async function staleWhileRevalidate(request) {

    const cache =
        await caches.open(
            CACHE_NAME
        );

    const cached =
        await cache.match(request);

    const networkPromise =
        fetch(request)
            .then(async response => {

                if (
                    response &&
                    response.ok
                ) {
                    await cache.put(
                        request,
                        response.clone()
                    );
                }

                return response;
            })
            .catch(() => null);

    if (cached) {
        networkPromise.catch(() => {});
        return cached;
    }

    const response =
        await networkPromise;

    if (response) {
        return response;
    }

    return caches.match(
        "/L-NC3R/garage.html"
    );
}
