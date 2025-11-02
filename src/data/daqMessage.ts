type SensorName = string;

export interface DAQMessage {
  timestamp: number;
  data: Record<SensorName, number[]>;
  relativeTimestamps: number[];
  sampleRate: number;
  messageVersion: number;
}
