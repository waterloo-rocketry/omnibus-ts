import { io } from 'socket.io-client'
import msgpackParser from 'socket.io-msgpack-parser'
import { toCamelCase, toSnakeCase } from './helpers.js'

import type { DAQMessage } from './data/daqMessage.ts'
import type {
    ParsleyMessage,
    CANCommandMessage,
    RLCSv3Message,
    ParsleyHeartbeatMessage,
} from './data/canMessage.ts'

export type AnyPayload =
    | DAQMessage
    | ParsleyMessage
    | CANCommandMessage
    | RLCSv3Message
    | ParsleyHeartbeatMessage

type ChannelLiteralToPayloadType<T extends AnyPayload> =
    T extends DAQMessage ? `DAQ${string}`
    : T extends ParsleyMessage ? `CAN/Parsley${string}`
    : T extends CANCommandMessage ? `CAN/Commands${string}`
    : T extends ParsleyHeartbeatMessage ? `Parsley/Health${string}`
    : T extends RLCSv3Message ? `RLCS${string}`
    : never

export interface Message<T extends AnyPayload> {
    channel: string
    timestamp: number
    payload: T
}

export interface MessageToSend<T extends AnyPayload> extends Message<T> {
    channel: ChannelLiteralToPayloadType<T>
}

export const socketCallbackBuilder = <T extends AnyPayload>(
    channel: string,
    afterMessageReceived: (msg: Message<T>) => void
) => {
    const buildMessageObject = (
        channel: string,
        timestamp: number,
        payload: object
    ) => {
        return {
            channel: channel,
            timestamp: timestamp,
            payload: toCamelCase(payload) as T,
        }
    }
    return (event: string, timestamp: number, payload: object) => {
        if (
            typeof timestamp !== 'number' ||
            typeof payload !== 'object' ||
            !payload
        ) {
            console.warn(
                `[Omnibus] Malformed Message! ${[event, timestamp, payload]}`
            )
            return
        }

        if (
            event.toLowerCase().startsWith(channel.toLowerCase()) ||
            channel === ''
        ) {
            afterMessageReceived(buildMessageObject(event, timestamp, payload))
        }
    }
}

export function getOmnibusSenderReceiver(serverURL: string) {
    const socket = io(serverURL, {
        parser: msgpackParser,
        transports: ['websocket'],
        upgrade: false,
    })

    const send = <T extends AnyPayload>(msg: MessageToSend<T>) => {
        socket.emit(msg.channel, msg.timestamp, toSnakeCase(msg.payload))
    }

    const _attachReceiver = <T extends AnyPayload>(
        channel: string | '',
        callback: (msg: Message<T>) => void
    ) => {
        socket.onAny(socketCallbackBuilder<T>(channel, callback))
    }

    const receive = <T extends AnyPayload>(
        channel: ChannelLiteralToPayloadType<T>,
        callback: (msg: Message<T>) => void
    ) => {
        _attachReceiver(channel, callback)
    }

    const receiveAll = (callback: (msg: Message<AnyPayload>) => void) => {
        _attachReceiver<AnyPayload>('', callback)
    }

    // No static type checking or runtime sanity checks
    const unsafeReceiveGenericMessage = <T = unknown>(
        callback: ({
            channel,
            timestamp,
            payload,
        }: {
            channel: string
            timestamp: number
            payload: T
        }) => void
    ) => {
        socket.onAny((event: string, timestamp: number, payload: T) => {
            callback({ channel: event, timestamp, payload })
        })
    }

    const disconnect = () => {
        socket.disconnect()
    }

    return {
        socket,
        sender: { send },
        receiver: {
            receive,
            receiveAll,
        },
        unsafeReceiveGenericMessage,
        disconnect,
    }
}
