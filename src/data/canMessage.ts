// TODO: This will extend a Parsley interface that will have boardTypeId... etc.
export interface ParsleyMessage<T = unknown> {
  boardTypeId: string;
  boardInstId: string;
  msgPrio: "LOW" | "MEDIUM" | "HIGH" | "HIGHEST";
  msgType: string;
  data: T | null; // parsley data payload
  parsley: string;
  messageVersion: number;
}

export interface CANCommandMessage<T = unknown> {
  boardTypeId: string;
  boardInstId: string;
  msgPrio: "LOW" | "MEDIUM" | "HIGH" | "HIGHEST";
  msgType: string;
  canMsg: T | null;
  parsley: string; // Parsley server instance ID
  messageVersion: number;
}

// TODO: Once RLCS uses a better message type, replace it (probably when RLCSv4 uses CAN)
type RLCSSensorName = string;
export type RLCSv3Message = Map<RLCSSensorName, number | string>;

export interface ParsleyHeartbeatMessage {
  id: string;
  health: string;
}
