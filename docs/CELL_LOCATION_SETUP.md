# Cell Location Lookup Setup

## Overview

The backend now supports automatic cell-tower location lookups using **Mozilla Location Services (MLS)**. When a device reports valid LTE cell information, the system will look up the approximate physical location of that cell tower and store it.

## How It Works

1. **Device sends LTE data**: The device reports MCC, MNC, TAC, and ECI in telemetry
2. **Backend validates**: MqttIngestionService checks that `lte.valid=true` and all required fields are present
3. **Lookup performed**: MozillaCellLocationService queries Mozilla MLS API with the cell info
4. **Location stored**: On successful lookup, `LastCellLatitude`, `LastCellLongitude`, and `LastCellLocationTimestamp` are updated in the Unit record

## Setup & Configuration

### Option 1: Free Tier (No API Key Required)

Mozilla Location Services provides a **free public API** with rate limits suitable for most deployments.

**No configuration needed.** Leave `CellLocation:MozillaApiKey` empty in `appsettings.json`.

- **Rate limit**: ~100 requests per second per IP
- **Accuracy**: Typically 100m–1km depending on data availability
- **Documentation**: [Mozilla Location Services](https://location.services.mozilla.com/)

### Option 2: Higher Rate Limits (Optional API Key)

To enable higher rate limits (500–1000 req/s), obtain a free API token:

1. Visit: https://location.services.mozilla.com/
2. Sign up for a free account or use an existing Mozilla account
3. Generate an API token from your account dashboard
4. Add to `appsettings.json`:

```json
{
  "CellLocation": {
    "MozillaApiKey": "YOUR_API_TOKEN_HERE"
  }
}
```

Or via environment variable:
```bash
export CellLocation__MozillaApiKey=YOUR_API_TOKEN_HERE
```

## Database Migration

A migration `AddCellLocationToUnit` adds three new nullable columns to the `units` table:

- `last_cell_latitude` (double precision) — Latitude in degrees
- `last_cell_longitude` (double precision) — Longitude in degrees  
- `last_cell_location_timestamp` (timestamp with time zone) — When lookup succeeded

Run migrations on startup (automatic via EF Core) or manually:

```bash
dotnet ef database update
```

## Implementation Details

### Service Architecture

- **ICellLocationService** — Interface for cell-location lookups
- **MozillaCellLocationService** — Implementation using Mozilla MLS API
- **MqttIngestionService** — Calls service when processing LTE data
- **Retry Logic** — Automatic 2x retry on HTTP errors (via Polly)
- **Timeout** — 10 seconds per lookup request

### Example Flow

**Device payload:**
```json
{
  "lte": {
    "valid": true,
    "mcc": 242,
    "mnc": 1,
    "tac": 12345,
    "eci": 6789012,
    "earfcn": 6400,
    "rsrp_dbm": -96
  }
}
```

**Backend logging (Debug level):**
```
Cell-site data from IMEI 123456789012345: MCC=242, MNC=1, TAC=12345, ECI=6789012, ...
Cell location lookup successful: MCC=242 MNC=1 TAC=12345 ECI=6789012 → Lat=59.9124 Lon=10.7654
Updated cell location for unit {UnitId} to Lat=59.9124 Lon=10.7654
```

**Unit record update:**
- `LastCellLatitude` = 59.9124
- `LastCellLongitude` = 10.7654
- `LastCellLocationTimestamp` = 2026-05-10T12:34:56Z

## Error Handling

- **No valid LTE data** → Skipped (logged at Debug level)
- **HTTP 4xx/5xx from MLS** → Logged at Warning level, skipped (will retry next telemetry)
- **Network timeout** → Automatic retry (2x), then skipped
- **JSON parse error** → Logged at Warning level, skipped
- **Unexpected exceptions** → Logged at Error level, skipped

## Monitoring

Monitor cell-location lookups via logs:

```bash
# Show all cell-location related entries
grep -i "cell" /var/log/trixma/*.log

# Show lookups that succeeded
grep "Cell location lookup successful" /var/log/trixma/*.log

# Show failures
grep "cell location lookup" /var/log/trixma/*.log | grep -v "successful"
```

## Future Enhancements

- [ ] Fallback to alternative providers (OpenCellID, Unwired Labs, etc.)
- [ ] TTL-based caching to avoid duplicate lookups for same cell
- [ ] Geographic cell database for offline lookups
- [ ] Averaging multiple cell locations for improved accuracy
