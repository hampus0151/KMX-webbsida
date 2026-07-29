import { onRequestPost } from "./functions/api/offert.js";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/api/offert" && request.method === "POST") {
            return onRequestPost({ request, env });
        }

        return env.ASSETS.fetch(request);
    }
};
