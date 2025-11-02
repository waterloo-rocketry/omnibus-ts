import { io } from "socket.io-client";
import msgpackParser from "socket.io-msgpack-parser";
import _ from "lodash";
import type { DAQMessage } from "./data/daqMessage.ts";

import type {
  ParsleyMessage,
  CANCommandMessage,
  RLCSv3Message,
  ParsleyHeartbeatMessage,
} from "./data/canMessage.ts";

export type AnyPayload =
  | DAQMessage
  | ParsleyMessage
  | CANCommandMessage
  | RLCSv3Message
  | ParsleyHeartbeatMessage;

export interface Message<T extends AnyPayload> {
  channel: string;
  timestamp: number;
  payload: T;
}

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

type CamelToSnakeCase<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? `${First extends Lowercase<First> ? First : `_${Lowercase<First>}`}${CamelToSnakeCase<Rest>}`
    : S;

type CamelCaseKeys<T extends object> = {
  [K in keyof T as K extends string ? SnakeToCamelCase<K> : K]: T[K];
};

type SnakeCaseKeys<T extends object> = {
  [K in keyof T as K extends string ? CamelToSnakeCase<K> : K]: T[K];
};

export const toSnakeCase = <T extends object>(obj: T) =>
  _.transform(obj, (result: SnakeCaseKeys<T>, value: any, key) => {
    const snakeKey = _.snakeCase(String(key)) as keyof SnakeCaseKeys<T>;
    result[snakeKey] =
      _.isObject(value) && !_.isArray(value) ? toSnakeCase(value) : value;
  });

export const toCamelCase = <T extends object>(obj: T) =>
  _.transform(obj, (result: CamelCaseKeys<T>, value: any, key) => {
    const camelKey = _.camelCase(String(key)) as keyof CamelCaseKeys<T>;
    result[camelKey] =
      _.isObject(value) && !_.isArray(value) ? toCamelCase(value) : value;
  });

export function getOmnibusSenderReceiver(serverURL: string) {
  const socket = io(serverURL, {
    parser: msgpackParser,
    transports: ["websocket"],
    upgrade: false,
  });

  const send = <T extends AnyPayload>(msg: Message<T>) => {
    socket.emit(msg.channel, msg.timestamp, toSnakeCase(msg.payload));
  };

  const attachReceiver = <T extends AnyPayload>(
    channel: string | "",
    callback: (msg: Message<T>) => void,
  ) => {
    const buildMessageObject = (
      channel: string,
      timestamp: number,
      payload: object,
    ) => {
      return {
        channel: channel,
        timestamp: timestamp,
        payload: toCamelCase(payload) as T,
      };
    };
    // TODO: Currently, this doesn't check at runtime the contents of the message as well as the messageVersion.
    // This should be updated once all Omnibus messages are defined.
    // Chris Yang (ChrisYx511)

    socket.onAny((event: string, timestamp: number, payload: object) => {
      if (typeof event !== "string")
        throw new Error(
          `[Omnibus] Malformed Message! ${[event, timestamp, payload]}`,
        );
      if (typeof timestamp !== "number")
        throw new Error(
          `[Omnibus] Malformed Message! ${[event, timestamp, payload]}`,
        );
      if (typeof payload !== "object")
        throw new Error(
          `[Omnibus] Malformed Message! ${[event, timestamp, payload]}`,
        );

      if (
        event.toLowerCase().startsWith(channel.toLowerCase()) ||
        channel === ""
      ) {
        callback(buildMessageObject(event, timestamp, payload));
      }
    });
  };

  const receiveDAQMessage = (
    channel: `DAQ${string}`,
    callback: (msg: Message<DAQMessage>) => void,
  ) => {
    attachReceiver<DAQMessage>(channel, callback);
  };

  const receiveParsleyMessage = (
    channel: `CAN/Parsley${string}`,
    callback: (msg: Message<ParsleyMessage>) => void,
  ) => {
    attachReceiver<ParsleyMessage>(channel, callback);
  };

  const receiveCANCommandMessage = (
    channel: `CAN/Command${string}`,
    callback: (msg: Message<CANCommandMessage>) => void,
  ) => {
    attachReceiver<CANCommandMessage>(channel, callback);
  };

  const receiveRLCSv3Message = (
    channel: `RLCS${string}`,
    callback: (msg: Message<RLCSv3Message>) => void,
  ) => {
    attachReceiver<RLCSv3Message>(channel, callback);
  };

  const receiveParsleyHeartbeatMessage = (
    channel: `Parsley/Heartbeat${string}`,
    callback: (msg: Message<ParsleyHeartbeatMessage>) => void,
  ) => {
    attachReceiver<ParsleyHeartbeatMessage>(channel, callback);
  };

  const receiveAnyMessage = (callback: (msg: Message<AnyPayload>) => void) => {
    attachReceiver<AnyPayload>("", callback);
  };

  // No static type checking or runtime sanity checks
  const unsafeReceiveGenericMessage = <T = unknown>(
    callback: ({
      channel,
      timestamp,
      payload,
    }: {
      channel: string;
      timestamp: number;
      payload: T;
    }) => void,
  ) => {
    socket.onAny((event: string, timestamp: number, payload: T) => {
      callback({ channel: event, timestamp, payload });
    });
  };

  const disconnect = () => {
    socket.disconnect();
  };

  return {
    socket,
    sender: { send },
    receiver: {
      receiveDAQMessage,
      receiveParsleyMessage,
      receiveCANCommandMessage,
      receiveRLCSv3Message,
      receiveParsleyHeartbeatMessage,
      receiveAnyMessage,
    },
    unsafeReceiveGenericMessage,
    disconnect,
  };
}
