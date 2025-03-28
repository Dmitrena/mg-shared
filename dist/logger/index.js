import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";
export function loggerFactory(fileUrl, correlationId) {
    const transport = process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
                ignore: "pid,hostname",
            },
        }
        : undefined;
    const baseLogger = pino.default({
        level: process.env.LOG_LEVEL || "info",
        transport,
        base: {
            env: process.env.ENV,
        },
    });
    const callerFile = fileURLToPath(fileUrl);
    return baseLogger.child({
        name: path.basename(callerFile, path.extname(callerFile)),
        path: path.basename(path.dirname(callerFile)),
        correlationId: correlationId || undefined,
    });
}
