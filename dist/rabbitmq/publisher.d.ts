import { PublishOptions, RabbitMQConfig } from "./types.js";
export declare class RabbitMQPublisher {
    private config;
    private readonly logger;
    private connection;
    constructor(config: RabbitMQConfig);
    publish(message: unknown, options?: PublishOptions): Promise<boolean>;
    publishToExchange(message: unknown, routingKey?: string, options?: PublishOptions): Promise<void>;
    close(): Promise<void>;
}
