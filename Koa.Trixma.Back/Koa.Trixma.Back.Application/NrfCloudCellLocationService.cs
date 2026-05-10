using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Koa.Trixma.Back.Application;

/// <summary>
/// Implements cell-location lookup using nRF Cloud Location Services.
/// </summary>
public class NrfCloudCellLocationService : ICellLocationService
{
    private const string BaseUrl = "https://api.nrfcloud.com/v1";

    private readonly HttpClient _httpClient;
    private readonly ILogger<NrfCloudCellLocationService> _logger;
    private readonly string? _organizationSlug;
    private readonly string? _projectSlug;
    private readonly string? _organizationAuthToken;

    public NrfCloudCellLocationService(
        HttpClient httpClient,
        ILogger<NrfCloudCellLocationService> logger,
        string? organizationSlug,
        string? projectSlug,
        string? organizationAuthToken)
    {
        _httpClient = httpClient;
        _logger = logger;
        _organizationSlug = organizationSlug;
        _projectSlug = projectSlug;
        _organizationAuthToken = organizationAuthToken;
    }

    public async Task<(double? Latitude, double? Longitude)?> LookupCellLocationAsync(int mcc, int mnc, int tac, int eci)
    {
        if (string.IsNullOrWhiteSpace(_organizationSlug) ||
            string.IsNullOrWhiteSpace(_projectSlug) ||
            string.IsNullOrWhiteSpace(_organizationAuthToken))
        {
            _logger.LogWarning(
                "nRF Cloud cell location lookup skipped because CellLocation:NrfCloud configuration is incomplete.");
            return null;
        }

        try
        {
            var url = $"{BaseUrl}/organizations/{Uri.EscapeDataString(_organizationSlug)}/projects/{Uri.EscapeDataString(_projectSlug)}/location/cell";
            var request = new NrfCloudCellRequest
            {
                Lte = new[]
                {
                    new NrfCloudLteCell
                    {
                        Mcc = mcc,
                        Mnc = mnc,
                        Tac = tac,
                        Eci = eci
                    }
                }
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(request, JsonOptions),
                    Encoding.UTF8,
                    "application/json")
            };
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _organizationAuthToken);

            using var response = await _httpClient.SendAsync(httpRequest);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogInformation(
                    "nRF Cloud found no location for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}. Response: {ResponseBody}",
                    mcc, mnc, tac, eci, responseBody);
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "nRF Cloud returned {StatusCode} for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}. Response: {ResponseBody}",
                    response.StatusCode, mcc, mnc, tac, eci, responseBody);
                return null;
            }

            var location = JsonSerializer.Deserialize<NrfCloudCellResponse>(responseBody, JsonOptions);
            if (location == null)
            {
                _logger.LogWarning(
                    "nRF Cloud returned an empty response for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}.",
                    mcc, mnc, tac, eci);
                return null;
            }

            _logger.LogDebug(
                "nRF Cloud location lookup successful: MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci} -> Lat={Lat} Lon={Lon} Uncertainty={Uncertainty} FulfilledWith={FulfilledWith}",
                mcc,
                mnc,
                tac,
                eci,
                location.Lat,
                location.Lon,
                location.Uncertainty,
                location.FulfilledWith);

            return (location.Lat, location.Lon);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex,
                "HTTP error during nRF Cloud cell location lookup for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}",
                mcc, mnc, tac, eci);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex,
                "JSON parsing error during nRF Cloud cell location lookup for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}",
                mcc, mnc, tac, eci);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unexpected error during nRF Cloud cell location lookup for MCC={Mcc} MNC={Mnc} TAC={Tac} ECI={Eci}",
                mcc, mnc, tac, eci);
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private class NrfCloudCellRequest
    {
        [JsonPropertyName("lte")]
        public NrfCloudLteCell[] Lte { get; set; } = Array.Empty<NrfCloudLteCell>();
    }

    private class NrfCloudLteCell
    {
        [JsonPropertyName("mcc")]
        public int Mcc { get; set; }

        [JsonPropertyName("mnc")]
        public int Mnc { get; set; }

        [JsonPropertyName("tac")]
        public int Tac { get; set; }

        [JsonPropertyName("eci")]
        public int Eci { get; set; }
    }

    private class NrfCloudCellResponse
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lon")]
        public double Lon { get; set; }

        [JsonPropertyName("uncertainty")]
        public int? Uncertainty { get; set; }

        [JsonPropertyName("fulfilledWith")]
        public string? FulfilledWith { get; set; }
    }
}