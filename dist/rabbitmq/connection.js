import amqp from "amqplib";
import { loggerFactory } from "../logger/index.js";
const logger = loggerFactory("file:///rabbitmq/connection.ts");
export class RabbitMQConnection {
    config;
    logger;
    channelModel = null;
    channel = null;
    connectionPromise = null;
    constructor(config) {
        this.config = config;
        this.logger = logger.child({
            class: "RabbitMQ_Connection",
        });
    }
    async initialize() {
        const lg = this.logger.child({ method: "initialize" });
        try {
            lg.debug("Connecting to RabbitMQ...");
            this.channelModel = await amqp.connect(this.config.url);
            this.channel = await this.channelModel.createChannel();
            this.channelModel.on("error", (err) => {
                lg.error("RabbitMQ connection error:", err);
                this.cleanup();
            });
            this.channelModel.on("close", () => {
                lg.info("RabbitMQ connection closed");
                this.cleanup();
            });
            if (this.config.exchange) {
                lg.debug("Asserting exchange", this.config.exchange);
                await this.channel.assertExchange(this.config.exchange, this.config.exchangeType || "direct", { durable: true });
            }
            if (this.config.queue) {
                lg.debug("Asserting queue", this.config.queue);
                await this.channel.assertQueue(this.config.queue, {
                    durable: this.config.queueOptions?.durable ?? true,
                    ...this.config.queueOptions,
                });
                if (this.config.exchange && this.config.queue) {
                    lg.debug("Binding queue to exchange", this.config.queue, this.config.exchange);
                    await this.channel.bindQueue(this.config.queue, this.config.exchange, this.config.routingKey || "");
                }
            }
            lg.info("RabbitMQ connection established");
        }
        catch (error) {
            lg.error("Failed to initialize RabbitMQ connection:", error);
            throw error;
        }
    }
    async getChannel() {
        const logContext = {
            hasExistingConnection: !!this.channelModel,
            hasExistingChannel: !!this.channel,
            hasPendingConnection: !!this.connectionPromise,
        };
        this.logger.debug(logContext, "Getting RabbitMQ channel...");
        if (!this.channelModel || !this.channel) {
            this.logger.debug(logContext, "No active channel found");
            if (!this.connectionPromise) {
                this.logger.debug(logContext, "Creating new connection promise...");
                this.connectionPromise = this.initialize();
            }
            try {
                this.logger.debug(logContext, "Waiting for connection promise...");
                await this.connectionPromise;
                this.logger.debug(logContext, "Connection promise resolved successfully");
            }
            catch (error) {
                this.logger.error({ ...logContext, error }, "Error while waiting for connection");
                throw error;
            }
        }
        if (!this.channel) {
            const error = new Error("Channel initialization failed");
            this.logger.error({ ...logContext, error }, "Channel not available after initialization");
            throw error;
        }
        this.logger.debug(logContext, "Returning active channel");
        return this.channel;
    }
    cleanup() {
        this.logger.debug("Cleanuping...");
        this.channelModel = null;
        this.channel = null;
        this.connectionPromise = null;
        this.logger.debug("Cleanuping executed successfully");
    }
    async close() {
        try {
            this.logger.debug("Closing RabbitMQ connection...");
            if (this.channel)
                await this.channel.close();
            if (this.channelModel)
                await this.channelModel.close();
            this.logger.info("RabbitMQ connection closed successfully");
        }
        catch (err) {
            this.logger.error("Error closing RabbitMQ connection: %o", err);
        }
        finally {
            this.cleanup();
        }
    }
    async withChannel(fn) {
        const channel = await this.getChannel();
        return fn(channel);
    }
}
