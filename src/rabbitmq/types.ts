export interface RabbitMQConfig {
  url: string;
  queue?: string;
  exchange?: string;
  exchangeType?: "direct" | "topic" | "fanout" | "headers";
  routingKey?: string;
  prefetchCount?: number;
  queueOptions?: {
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    arguments?: {
      "x-dead-letter-exchange"?: string;
      "x-dead-letter-routing-key"?: string;
      "x-message-ttl"?: number;
      [key: string]: any;
    };
  };
}

export interface BaseEvent<TType extends string, TData> {
  type: TType;
  data: TData;
  metadata?: {
    timestamp?: Date;
    source?: string;
    correlationId?: string;
    [key: string]: any;
  };
}

export type UserCreatedEvent = BaseEvent<
  "USER_CREATED",
  {
    userId: string;
    email: string;
    name: string;
  }
>;

export type UserDeletedEvent = BaseEvent<
  "USER_DELETED",
  {
    userId: string;
  }
>;

export type UserEvent = UserCreatedEvent | UserDeletedEvent;

export interface MessageHandler<T = any> {
  (message: T): Promise<void>;
}

export interface PublishOptions {
  persistent?: boolean;
  correlationId?: string;
  headers?: Record<string, any>;
}

export interface MessageHandler<T = any> {
  (message: T): Promise<void>;
}
