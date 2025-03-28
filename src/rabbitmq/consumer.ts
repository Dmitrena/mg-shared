import { loggerFactory } from "../logger/index.js";
import { RabbitMQConnection } from "./connection.js";
import { RabbitMQConfig, MessageHandler } from "./types.js";

const logger = loggerFactory("file:///rabbitmq/consumer.ts");

export class RabbitMQConsumer {
  private readonly logger;
  private connection: RabbitMQConnection;
  private consumerTag: string | null = null;

  constructor(private config: RabbitMQConfig) {
    if (!config.queue) {
      throw new Error("Queue must be configured for consumer");
    }
    this.logger = logger.child({
      class: "RabbitMQ_Consumer",
    });
    this.connection = new RabbitMQConnection(config);
  }

  async consume(
    handler: MessageHandler,
    options?: { noAck?: boolean; consumerTag?: string }
  ): Promise<string> {
    const lg = this.logger.child({ method: "consume" });
    return this.connection.withChannel(async (channel) => {
      if (this.config.prefetchCount) {
        lg.debug("Setting prefetch count to", this.config.prefetchCount);
        await channel.prefetch(this.config.prefetchCount);
      }

      const { consumerTag } = await channel.consume(
        this.config.queue!,
        async (msg) => {
          if (!msg) {
            lg.warn("Received null message");
            return;
          }

          const correlationId = msg.properties.correlationId;
          const messageLogger = loggerFactory(import.meta.url, correlationId);

          try {
            const message = JSON.parse(msg.content.toString());
            messageLogger.debug("Processing message:", message);

            await handler(message);
            if (!options?.noAck) {
              channel.ack(msg);
              messageLogger.debug("Message acknowledged");
            }
          } catch (error) {
            messageLogger.error("Error processing message:", error);
            if (!options?.noAck) {
              channel.nack(msg, false, false);
              messageLogger.debug("Message negatively acknowledged");
            }
          }
        },
        {
          noAck: options?.noAck ?? false,
          consumerTag: options?.consumerTag,
        }
      );

      this.consumerTag = consumerTag;
      lg.info("Consumer started with tag:", consumerTag);
      return consumerTag;
    });
  }

  async cancel(consumerTag?: string): Promise<void> {
    const lg = this.logger.child({ method: "cancel" });

    const targetConsumerTag = consumerTag || this.consumerTag;

    const logContext = {
      consumerTag: targetConsumerTag,
      queue: this.config.queue,
    };

    if (!targetConsumerTag) {
      lg.warn(
        logContext,
        "Attempted to cancel consumer with no active consumerTag"
      );
      return;
    }

    lg.debug(logContext, "Attempting to cancel consumer");

    try {
      await this.connection.withChannel(async (channel) => {
        try {
          lg.debug(logContext, "Sending cancel request to channel");
          await channel.cancel(consumerTag || this.consumerTag!);
          this.consumerTag = null;
          lg.info(logContext, "Successfully cancelled consumer");
        } catch (error) {
          lg.error(
            { ...logContext, error },
            "Failed to cancel consumer on channel"
          );
          throw error;
        }
      });
    } catch (error) {
      lg.error(
        { ...logContext, error },
        "Channel operation failed during consumer cancellation"
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    const lg = this.logger.child({ method: "close" });

    const logContext = {
      queue: this.config.queue,
      hasActiveConsumer: !!this.consumerTag,
    };

    lg.debug(logContext, "Closing consumer connection");

    try {
      if (this.consumerTag) {
        lg.debug(
          { ...logContext, consumerTag: this.consumerTag },
          "Active consumer found, cancelling first"
        );
        await this.cancel();
      }

      lg.debug(logContext, "Closing underlying connection");
      await this.connection.close();
      lg.info(logContext, "Consumer connection closed successfully");
    } catch (error) {
      lg.error({ ...logContext, error }, "Failed to close consumer connection");
      throw error;
    }
  }
}
