import { v4 as uuidv4 } from "uuid";

const logMiddleware = (req, res, next) => {
    const start = Date.now();
    // extract session id from cookie or header
    const sessionFromHeader = req.headers["x-session-id"];
    req.sessionId = sessionFromHeader || uuidv4();
    // capture some inbound data
    const inbound = {
        method: req.method,
        path: req.originalUrl,
        headers: req.headers,
        query: req.query,
        body: {},
        // don't log full headers; indicate presence and partially mask auth
        headers: {
            authorization: req.headers.authorization ? "present" : "absent",
            host: req.headers.host,
            "user-agent": req.headers["user-agent"]
        }
    };

    // attach truncated body if present (safe size)
    if (req.body && Object.keys(req.body).length) {
        try {
            const json = JSON.stringify(req.body);
            inbound.body = json.length > 1024 ? json.slice(0, 1024) + "..." : JSON.parse(json);
        } catch (e) {
            inbound.body = {};
        }
    }

    // wrap res.send to capture body
    const _send = res.send.bind(res);
    res.send = function (body) {
        try {
            let stored = body;
            if (typeof body === "object") stored = JSON.stringify(body);
            else stored = String(body);
            if (stored.length > 1024) stored = stored.slice(0, 1024) + "...";
            try {
                res.__loggedBody = JSON.parse(stored);
            } catch (e) {
                res.__loggedBody = stored;
            }
        } catch (e) {
            res.__loggedBody = "<capture_error>";
        }
        return _send(body);
    };

    res.on("finish", () => {
        const duration = Date.now() - start;
        const outbound = {
            status: res.statusCode,
            duration_ms: duration,
            body: res.__loggedBody,
            trace_id: req.traceId,
            session_id: req.sessionId
        };
        const useCase = req?.useCase || "none";

        const logObj = {
            timestamp: new Date().toISOString(),
            // get service name from package.json
            service: process.env.SERVICE_NAME || "unknown",
            version: process.env.SERVICE_VERSION || "unknown",
            inbound: { ...inbound },
            outbound,
            useCase,
            trace_id: req.traceId,
            session_id: req.sessionId,
        };
        console.log(JSON.stringify(logObj));
    });

    next();
}

function traceIdMiddleware(req, res, next) {
    const traceId = req.headers["x-request-id"] || uuidv4();
    req.traceId = traceId;
    res.setHeader("X-Request-Id", traceId);
    next();
}
export { traceIdMiddleware, logMiddleware };