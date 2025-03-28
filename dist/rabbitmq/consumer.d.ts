import { RabbitMQConfig, MessageHandler } from "./types.js";
export declare class RabbitMQConsumer {
    private config;
    private readonly logger;
    private connection;
    private consumerTag;
    constructor(config: RabbitMQConfig);
    consume(handler: MessageHandler, options?: {
        noAck?: boolean;
        consumerTag?: string;
    }): Promise<string>;
    cancel(consumerTag?: string): Promise<void>;
    close(): Promise<void>;
}
