namespace Koa.Trixma.Back.Application;

/// <summary>
/// Service for looking up physical location based on cellular tower information.
/// </summary>
public interface ICellLocationService
{
    /// <summary>
    /// Look up latitude/longitude for a cellular tower using MCC, MNC, TAC, and ECI.
    /// </summary>
    /// <param name="mcc">Mobile Country Code</param>
    /// <param name="mnc">Mobile Network Code</param>
    /// <param name="tac">Tracking Area Code (decimal)</param>
    /// <param name="eci">E-UTRAN Cell ID (decimal)</param>
    /// <returns>Tuple of (latitude, longitude) in degrees, or (null, null) if lookup fails</returns>
    Task<(double? Latitude, double? Longitude)?> LookupCellLocationAsync(int mcc, int mnc, int tac, int eci);
}
