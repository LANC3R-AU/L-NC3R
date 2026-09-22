const CACHE_NAME = "lanc3r-garage-v1";

const APP_SHELL = [
    "/L-NC3R/garage.html",
    "/L-NC3R/manifest.json",
    "/L-NC3R/icons/icon-192.png",
    "/L-NC3R/icons/icon-512.png"
];


/*
    INSTALL

    Cache only the static Garage app shell.
    Supabase data is intentionally NOT cached.
*/
self.addEventListener("install", event => {

    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(APP_SHELL);
            })
    );

    self.skipWaiting();
});


/*
    ACTIVATE

    Remove older versions of the Garage cache.
*/
self.addEventListener("activate", event => {

    event.waitUntil(
        caches
            .keys()
            .then(cacheNames => {

                return Promise.all(
                    cacheNames
                        .filter(
                            name =>
                                name !== CACHE_NAME
                        )
                        .map(
                            name =>
                                caches.delete(name)
                        )
                );

            })
    );

    self.clients.claim();
});


/*
    FETCH

    Supabase/API requests are left alone.

    For our own GitHub Pages files:
    try the network first so the newest version is used.

    If the connection fails, use the cached copy.
*/
self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url =
        new URL(request.url);

    if (
        url.origin !==
        self.location.origin
    ) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {

                if (
                    response &&
                    response.status === 200
                ) {

                    const copy =
                        response.clone();

                    caches
                        .open(CACHE_NAME)
                        .then(cache => {
                            cache.put(
                                request,
                                copy
                            );
                        });
                }

                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );

});
