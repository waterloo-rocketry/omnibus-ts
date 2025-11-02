import { expect, describe, it, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, Server as HTTPServer } from "node:http";
import { Server } from "socket.io";
import msgpackParser from "socket.io-msgpack-parser";

import { getOmnibusSenderReceiver } from "../src/message.js";

describe("test Omnibus communication functions", () => {
  let server: HTTPServer | null = null;

  beforeAll(() => {
    const app = express();
    server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket"],
      parser: msgpackParser,
    });

    io.on("connection", (socket) => {
      console.log("connection established, sid: " + socket.id);
      socket.onAny((event, ...args) => {
        // Echo back the received event and arguments
        socket.emit(event, ...args);
      });
    });
    server.listen(3000);
  });

  afterAll(() => {
    expect(server).not.toBeNull();
    server?.close();
  });

  const getCommunicatorInstance = async () => {
    const communicator = getOmnibusSenderReceiver("http://localhost:3000");
    await new Promise((res) =>
      communicator.socket.on("connect", () => res("Connected")),
    );
    return communicator;
  };

  it("should establish a connection", async () => {
    const fns = await getCommunicatorInstance();
    expect(fns.socket.id).not.toBeUndefined();
  });

  it("should send and receive messages", async () => {
    const fns = await getCommunicatorInstance();
    const testChannel = "Test/AnyMessage";
    const testPayload = "test";
    fns.unsafeReceiveGenericMessage(({ channel, payload }) => {
      expect(channel).toBe(testChannel);
      expect(payload).toBe("test");
    });
    fns.socket.emit(testChannel, Date.now(), testPayload);
  });
});
