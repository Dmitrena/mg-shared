import { Channel } from "amqplib";
import { RabbitMQConfig } from "./types.js";
export declare class RabbitMQConnection {
    private config;
    private readonly logger;
    private channelModel;
    private channel;
    private connectionPromise;
    constructor(config: RabbitMQConfig);
    private initialize;
    getChannel(): Promise<Channel>;
    private cleanup;
    close(): Promise<void>;
    withChannel<T>(fn: (channel: Channel) => Promise<T>): Promise<T>;
}
