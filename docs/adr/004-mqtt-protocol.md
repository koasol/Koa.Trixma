# ADR-004: MQTT Topic Structure and Message Protocol

**Date:** 2026-03-31
**Status:** Accepted

## Context

Devices need a way to report measurements and receive commands over MQTT, in addition to the existing HTTP endpoints. The protocol must be simple enough for embedded firmware and consistent with existing domain concepts (deviceId, measurement type/value).

## Decision

### Topic structure

| Direction | Topic pattern | Description |
|-----------|--------------|-------------|
| Device → Server | `trixma/devices/{deviceId}/telemetry` | Batch measurement upload |
| Server → Device | `trixma/devices/{deviceId}/commands` | Command delivery |

`{deviceId}` can be any of: Unit GUID, MAC address, or NFC ID — matched by the existing `UnitRepository.GetByDeviceIdAsync()` lookup.

### Telemetry message (device → server)

```json
{
  "measurements": [
    { "type": "temperature", "value": 23.5 },
    { "type": "humidity", "value": 65.2, "timestamp": "2026-03-31T12:00:00Z" }
  ]
}
```

- `type`: string, required. Free-form label (e.g. `"temperature"`, `"humidity"`, `"co2"`)
- `value`: number, required. Double precision.
- `timestamp`: ISO 8601 UTC, optional. Defaults to server UTC time on receipt.

### Command message (server → device)

```json
{ "command": "reboot" }
{ "command": "config", "payload": { "reportInterval": 30 } }
```

- `command`: string, required. Device interprets this as it sees fit.
- `payload`: any JSON object, optional. Command-specific parameters.

## Implementation

- `MqttService.SubscribeAsync()` handles topic-filter subscription with `+` and `#` wildcard matching
- `MqttIngestionService` (IHostedService) subscribes to `trixma/devices/+/telemetry` on startup and funnels data into `MeasurementService.IngestAsync()` — the same ingestion path used by the HTTP endpoint
- `POST /mqtt/devices/{deviceId}/command` endpoint lets authenticated users send commands to devices
- `MqttService.SendCommandAsync()` publishes to `trixma/devices/{deviceId}/commands`

## Consequences

- MQTT telemetry is a second ingestion path alongside `POST /units/measurements/report`. Both store to the same TimescaleDB hypertable.
- Devices can use either HTTP or MQTT for measurement reporting — useful for constrained devices where MQTT is more efficient.
- Command delivery is fire-and-forget (QoS 0 by default). No acknowledgment mechanism is currently defined.
- If the MQTT broker is unavailable at startup, the backend logs an error but continues running. Telemetry ingestion will not work until MQTT reconnects.
