import pino from "pino";
import { URL } from "url";
export declare function loggerFactory(fileUrl: string | URL, correlationId?: string): pino.pino.Logger<never, boolean>;
