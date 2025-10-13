import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "./logger/Logger.js";
import { LoggerAction } from "./logger/types.js";

interface CustomResponse extends Response {
    __loggedBody?: any;
}

export const logMiddleware = (req: Request, res: CustomResponse, next: NextFunction): void => {
    const start = Date.now();
    let finished = false; // Flag to prevent duplicate finish events

    // Extract session id from cookie or header
    const sessionFromHeader = req.headers["x-session-id"] as string | undefined;
    req.sessionId = sessionFromHeader || uuidv4();

    req.logger = new Logger({
        service: process.env.SERVICE_NAME || "oauth-server",
        version: process.env.SERVICE_VERSION || "1.0.0",
        sessionId: req.sessionId,
        traceId: req?.traceId || "none",
    }, req)

    // Wrap res.send to capture body
    const _send = res.send.bind(res);
    res.send = function (body: any) {
        try {
            let stored: string = body;
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

    const handleFinish = () => {
        if (finished) return; // Prevent duplicate execution
        finished = true;


        if (req.logger && req.logger.autoOutbound()) {

            const outbound = {
                status: res.statusCode,
                headers: res.getHeaders(),
                body: res.__loggedBody,
            };
            try {
                req.logger?.info(LoggerAction.OUTBOUND("Response sent"), outbound, req.logger.getOutboundMaskingOptions());
                req.logger?.end(res.statusCode);
            } catch (error) {
                console.error("Logger error:", error);
            } finally {
                req.logger = undefined as any;
            }
        }
    };

    // Listen to both finish and close events to ensure logging
    res.once("finish", handleFinish);
    res.once("close", handleFinish);

    next();
};

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const traceId = (req.headers["x-request-id"] as string) || uuidv4();
    req.traceId = traceId;
    res.setHeader("X-Request-Id", traceId);
    next();
}