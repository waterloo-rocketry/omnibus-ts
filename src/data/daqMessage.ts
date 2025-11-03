type SensorName = string

export interface DAQMessage extends Record<string, unknown> {
    timestamp: number
    data: Record<SensorName, number[]>
    relativeTimestamps: number[]
    sampleRate: number
    messageVersion: number
}
