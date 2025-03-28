import { loggerFactory } from "../logger/index.js";
import { RabbitMQConnection } from "./connection.js";
const logger = loggerFactory("file:///rabbitmq/publisher.ts");
export class RabbitMQPublisher {
    config;
    logger;
    connection;
    constructor(config) {
        this.config = config;
        if (!config.queue && !config.exchange) {
            throw new Error("Either queue or exchange must be configured");
        }
        this.logger = logger.child({
            class: "RabbitMQ_Publisher",
        });
        this.connection = new RabbitMQConnection(config);
    }
    async publish(message, options) {
        const lg = this.logger.child({ method: "publish" });
        if (!this.config.queue) {
            throw new Error("No queue configured for this publisher");
        }
        const correlationId = options?.correlationId;
        lg.debug({ correlationId }, "Publishing message to queue", this.config.queue);
        return this.connection.withChannel(async (channel) => {
            try {
                const result = await channel.sendToQueue(this.config.queue, Buffer.from(JSON.stringify(message)), {
                    persistent: options?.persistent ?? true,
                    headers: options?.headers,
                    correlationId: options?.correlationId,
                });
                lg.debug({ correlationId }, "Message published successfully");
                return result;
            }
            catch (error) {
                lg.error({ correlationId }, "Failed to publish message:", error);
                throw error;
            }
        });
    }
    async publishToExchange(message, routingKey = "", options) {
        const lg = this.logger.child({ method: "publishToExchange" });
        const correlationId = options?.correlationId;
        const logContext = {
            correlationId,
            exchange: this.config.exchange,
            routingKey,
            messageType: typeof message === "object" ? message?.type : undefined,
        };
        lg.debug(logContext, "Publishing message to exchange");
        if (!this.config.exchange) {
            const error = new Error("No exchange configured for this publisher");
            lg.error({ ...logContext, error }, "Exchange configuration error");
            throw error;
        }
        try {
            await this.connection.withChannel(async (channel) => {
                try {
                    const messageString = JSON.stringify(message);
                    lg.trace({ ...logContext, messageSize: messageString.length }, "Serialized message for publishing");
                    channel.publish(this.config.exchange, routingKey, Buffer.from(messageString), {
                        persistent: options?.persistent ?? true,
                        headers: options?.headers,
                        correlationId,
                    });
                    lg.debug({ ...logContext }, "Message successfully published to exchange");
                }
                catch (publishError) {
                    lg.error({ ...logContext, error: publishError }, "Failed to publish message to exchange");
                    throw publishError;
                }
            });
        }
        catch (channelError) {
            lg.error({ ...logContext, error: channelError }, "Channel operation failed during publish");
            throw channelError;
        }
    }
    async close() {
        const lg = this.logger.child({ method: "close" });
        const logContext = {
            exchange: this.config.exchange,
            queue: this.config.queue,
        };
        lg.debug(logContext, "Closing publisher connection");
        try {
            await this.connection.close();
            lg.debug(logContext, "Publisher connection closed successfully");
        }
        catch (error) {
            lg.error({ ...logContext, error }, "Failed to close publisher connection");
            throw error;
        }
    }
}
