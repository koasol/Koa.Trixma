using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

/// <summary>
/// Implements cell-location lookup using Mozilla Location Services (MLS) API.
/// Free service: https://location.services.mozilla.com/
/// Supports optional API token for higher rate limits.
/// </summary>
public class MozillaCellLocationService : ICellLocationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MozillaCellLocationService> _logger;
    private readonly string? _apiKey;
    private const string BaseUrl = "https://location.services.mozilla.com/v1/geolocate";
    private const string RadioType = "lte";

    public MozillaCellLocationService(HttpClient httpClient, ILogger<MozillaCellLocationService> logger, string? apiKey = null)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = apiKey;
    }

    public async Task<(double? Latitude, double? Longitude)?> LookupCellLocationAsync(int mcc, int mnc, int tac, int eci)
    {
        try
        {
            var url = _apiKey != null ? $"{BaseUrl}?key={_apiKey}" : BaseUrl;

            var request = new MozillaMlsRequest
            {
                CellTowers = new[]
                {
                    new MozillaMlsCellTower
                    {
                        RadioType = RadioType,
                        CellId = eci,
                        LocationAreaCode = tac,
                        MobileCountryCode = mcc,
                        MobileNetworkCode = mnc,
                        SignalStrength = null  // Optional; we don't have this from device
                    }
                }
            };

            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var content = new StringContent(
                JsonSerializer.Serialize(request, jsonOptions),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var response = await _httpClient.PostAsync(url, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                if ((int)response.StatusCode == 404)
                {
                    _logger.LogInformation(
                        "Mozilla MLS found no location for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}. Response: {ResponseBody}",
                        mcc, mnc, tac, eci, responseBody);
                    return null;
                }

                _logger.LogWarning(
                    "Mozilla MLS returned {StatusCode} for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}. Response: {ResponseBody}",
                    response.StatusCode, mcc, mnc, tac, eci, responseBody);
                return null;
            }

            var mlsResponse = JsonSerializer.Deserialize<MozillaMlsResponse>(responseBody, jsonOptions);

            if (mlsResponse?.Location == null)
            {
                _logger.LogDebug("Mozilla MLS returned no location for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}", 
                    mcc, mnc, tac, eci);
                return null;
            }

            _logger.LogDebug(
                "Cell location lookup successful: MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci} → Lat={Lat} Lon={Lon}",
                mcc, mnc, tac, eci, mlsResponse.Location.Lat, mlsResponse.Location.Lon);

            return (mlsResponse.Location.Lat, mlsResponse.Location.Lon);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "HTTP error during cell location lookup for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}",
                mcc, mnc, tac, eci);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "JSON parsing error during cell location lookup for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}",
                mcc, mnc, tac, eci);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during cell location lookup for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}",
                mcc, mnc, tac, eci);
            return null;
        }
    }

    private class MozillaMlsRequest
    {
        [JsonPropertyName("cellTowers")]
        public MozillaMlsCellTower[] CellTowers { get; set; } = Array.Empty<MozillaMlsCellTower>();

        [JsonPropertyName("considerIp")]
        public bool ConsiderIp { get; set; } = false;
    }

    private class MozillaMlsCellTower
    {
        [JsonPropertyName("radioType")]
        public string? RadioType { get; set; }

        [JsonPropertyName("cellId")]
        public int CellId { get; set; }

        [JsonPropertyName("locationAreaCode")]
        public int LocationAreaCode { get; set; }

        [JsonPropertyName("mobileCountryCode")]
        public int MobileCountryCode { get; set; }

        [JsonPropertyName("mobileNetworkCode")]
        public int MobileNetworkCode { get; set; }

        [JsonPropertyName("signalStrength")]
        public int? SignalStrength { get; set; }
    }

    private class MozillaMlsResponse
    {
        [JsonPropertyName("location")]
        public MozillaMlsLocation? Location { get; set; }

        [JsonPropertyName("accuracy")]
        public double? Accuracy { get; set; }
    }

    private class MozillaMlsLocation
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lng")]
        public double Lon { get; set; }
    }
}
