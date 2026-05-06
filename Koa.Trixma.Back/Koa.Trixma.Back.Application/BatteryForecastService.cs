using Koa.Trixma.Back.Data.Repositories;
using Koa.Trixma.Back.Domain.Models;

namespace Koa.Trixma.Back.Application;

public interface IBatteryForecastService
{
    Task RecalculateForUnitAsync(Unit unit);
}

public class BatteryForecastService : IBatteryForecastService
{
    private const string BatteryType = "battery_mv";
    private readonly IMeasurementRepository _measurementRepository;
    private readonly IUnitRepository _unitRepository;

    public BatteryForecastService(
        IMeasurementRepository measurementRepository,
        IUnitRepository unitRepository)
    {
        _measurementRepository = measurementRepository;
        _unitRepository = unitRepository;
    }

    public async Task RecalculateForUnitAsync(Unit unit)
    {
        var now = DateTime.UtcNow;
        var recentMeasurements = (await _measurementRepository.GetRecentByUnitAndTypeAsync(
                unit.Id,
                BatteryType,
                now.AddDays(-21),
                400))
            .OrderBy(m => m.Timestamp)
            .ToList();

        if (unit.BatteryMv.HasValue)
        {
            unit.BatteryPercent = ConvertBatteryMvToPercent(unit.BatteryMv.Value);
        }

        if (recentMeasurements.Count < 6)
        {
            MarkAsInsufficient(unit, now);
            await _unitRepository.UpdateAsync(unit);
            return;
        }

        var smoothed = SmoothSamples(recentMeasurements);
        if (smoothed.Count < 6)
        {
            MarkAsInsufficient(unit, now);
            await _unitRepository.UpdateAsync(unit);
            return;
        }

        var latest = smoothed[^1];
        var currentPercent = Math.Clamp(latest.Percent, 0, 100);

        var lastSlope = GetSlopePctPerHour(smoothed[^2], smoothed[^1]);
        if (lastSlope > 0.2)
        {
            unit.BatteryPercent = Math.Round(currentPercent, 1);
            unit.BatteryForecastStatus = "charging";
            unit.BatteryForecastEstimatedAt = now;
            unit.BatteryForecastSegmentStartAt = null;
            unit.BatteryRemainingHours = null;
            unit.BatteryDischargeRatePctPerHour = null;
            unit.BatteryForecastConfidence = 0;
            await _unitRepository.UpdateAsync(unit);
            return;
        }

        var chargeStartIndex = FindLastChargeStart(smoothed);
        var minSegmentSize = 6;

        var best = FindBestStableSegment(smoothed, chargeStartIndex, minSegmentSize);
        if (best == null)
        {
            MarkAsUnstable(unit, now, currentPercent);
            await _unitRepository.UpdateAsync(unit);
            return;
        }

        var slope = best.Value.SlopePctPerHour;
        if (slope >= -0.01)
        {
            MarkAsUnstable(unit, now, currentPercent);
            await _unitRepository.UpdateAsync(unit);
            return;
        }

        var dischargeRate = Math.Abs(slope);
        var remainingHours = currentPercent / dischargeRate;
        remainingHours = Math.Clamp(remainingHours, 0, 24 * 90);

        var confidence = CalculateConfidence(best.Value.PointCount, best.Value.RSquared, best.Value.StdDevPctPerHour);

        unit.BatteryPercent = Math.Round(currentPercent, 1);
        unit.BatteryRemainingHours = Math.Round(remainingHours, 1);
        unit.BatteryDischargeRatePctPerHour = Math.Round(dischargeRate, 4);
        unit.BatteryForecastConfidence = Math.Round(confidence, 2);
        unit.BatteryForecastEstimatedAt = now;
        unit.BatteryForecastSegmentStartAt = best.Value.StartTimestamp;
        unit.BatteryForecastStatus = "ok";

        await _unitRepository.UpdateAsync(unit);
    }

    private static void MarkAsInsufficient(Unit unit, DateTime now)
    {
        unit.BatteryForecastStatus = "insufficient_data";
        unit.BatteryForecastEstimatedAt = now;
        unit.BatteryForecastSegmentStartAt = null;
        unit.BatteryRemainingHours = null;
        unit.BatteryDischargeRatePctPerHour = null;
        unit.BatteryForecastConfidence = 0;
    }

    private static void MarkAsUnstable(Unit unit, DateTime now, double currentPercent)
    {
        unit.BatteryPercent = Math.Round(currentPercent, 1);
        unit.BatteryForecastStatus = "unstable";
        unit.BatteryForecastEstimatedAt = now;
        unit.BatteryForecastSegmentStartAt = null;
        unit.BatteryRemainingHours = null;
        unit.BatteryDischargeRatePctPerHour = null;
        unit.BatteryForecastConfidence = 0.1;
    }

    private static double ConvertBatteryMvToPercent(int mv)
    {
        var voltage = mv / 1000d;

        if (voltage >= 4.1) return 100;
        if (voltage >= 4.0) return 90;
        if (voltage >= 3.9) return 80;
        if (voltage >= 3.85) return 70;
        if (voltage >= 3.8) return 60;
        if (voltage >= 3.75) return 50;
        if (voltage >= 3.7) return 40;
        if (voltage >= 3.65) return 30;
        if (voltage >= 3.5) return 20;
        if (voltage >= 3.3) return 10;
        if (voltage >= 3.0) return 5;
        return 0;
    }

    private static List<BatterySample> SmoothSamples(IReadOnlyList<Measurement> raw)
    {
        const double alpha = 0.35;

        var samples = raw
            .Select(m => new BatterySample(m.Timestamp, ConvertBatteryMvToPercent((int)Math.Round(m.Value))))
            .OrderBy(s => s.Timestamp)
            .ToList();

        if (samples.Count == 0)
        {
            return samples;
        }

        var smoothed = new List<BatterySample>(samples.Count);
        var ewma = samples[0].Percent;
        smoothed.Add(new BatterySample(samples[0].Timestamp, ewma));

        for (var i = 1; i < samples.Count; i++)
        {
            ewma = alpha * samples[i].Percent + (1 - alpha) * ewma;
            smoothed.Add(new BatterySample(samples[i].Timestamp, ewma));
        }

        return smoothed;
    }

    private static int FindLastChargeStart(IReadOnlyList<BatterySample> samples)
    {
        var index = 0;
        for (var i = 1; i < samples.Count; i++)
        {
            var hours = (samples[i].Timestamp - samples[i - 1].Timestamp).TotalHours;
            if (hours <= 0) continue;

            var deltaPct = samples[i].Percent - samples[i - 1].Percent;
            var slope = deltaPct / hours;
            if (deltaPct >= 1.2 && slope > 0.3)
            {
                index = i;
            }
        }

        return index;
    }

    private static SegmentFit? FindBestStableSegment(IReadOnlyList<BatterySample> samples, int chargeStartIndex, int minSegmentSize)
    {
        SegmentFit? best = null;

        for (var start = chargeStartIndex; start <= samples.Count - minSegmentSize; start++)
        {
            var segment = samples.Skip(start).ToList();
            if (segment.Count < minSegmentSize)
            {
                continue;
            }

            var fit = FitLinearTrend(segment);
            if (fit == null)
            {
                continue;
            }

            if (fit.Value.SlopePctPerHour >= -0.01)
            {
                continue;
            }

            if (fit.Value.RSquared < 0.35)
            {
                continue;
            }

            if (fit.Value.StdDevPctPerHour > 1.5)
            {
                continue;
            }

            var candidate = fit.Value with
            {
                StartTimestamp = segment[0].Timestamp,
                PointCount = segment.Count
            };

            if (best == null || candidate.PointCount > best.Value.PointCount)
            {
                best = candidate;
            }
        }

        return best;
    }

    private static SegmentFit? FitLinearTrend(IReadOnlyList<BatterySample> segment)
    {
        if (segment.Count < 2)
        {
            return null;
        }

        var t0 = segment[0].Timestamp;
        var xs = segment.Select(s => (s.Timestamp - t0).TotalHours).ToArray();
        var ys = segment.Select(s => s.Percent).ToArray();

        var meanX = xs.Average();
        var meanY = ys.Average();

        var ssxx = 0d;
        var ssxy = 0d;
        for (var i = 0; i < xs.Length; i++)
        {
            var dx = xs[i] - meanX;
            ssxx += dx * dx;
            ssxy += dx * (ys[i] - meanY);
        }

        if (Math.Abs(ssxx) < 1e-9)
        {
            return null;
        }

        var slope = ssxy / ssxx;
        var intercept = meanY - slope * meanX;

        var sst = 0d;
        var ssr = 0d;
        for (var i = 0; i < xs.Length; i++)
        {
            var prediction = intercept + slope * xs[i];
            var residual = ys[i] - prediction;
            ssr += residual * residual;
            var total = ys[i] - meanY;
            sst += total * total;
        }

        var rSquared = sst <= 1e-9 ? 1 : 1 - (ssr / sst);
        var stdDev = Math.Sqrt(ssr / xs.Length);

        return new SegmentFit(
            slope,
            Math.Clamp(rSquared, 0, 1),
            stdDev,
            segment[0].Timestamp,
            segment.Count);
    }

    private static double GetSlopePctPerHour(BatterySample a, BatterySample b)
    {
        var hours = (b.Timestamp - a.Timestamp).TotalHours;
        if (hours <= 0)
        {
            return 0;
        }

        return (b.Percent - a.Percent) / hours;
    }

    private static double CalculateConfidence(int pointCount, double rSquared, double stdDevPctPerHour)
    {
        var dataScore = Math.Min(1.0, pointCount / 28.0);
        var fitScore = Math.Clamp(rSquared, 0, 1);
        var noisePenalty = Math.Clamp(stdDevPctPerHour / 2.0, 0, 1);

        var confidence = 0.15 + 0.45 * dataScore + 0.4 * fitScore - 0.25 * noisePenalty;
        return Math.Clamp(confidence, 0, 1);
    }

    private readonly record struct BatterySample(DateTime Timestamp, double Percent);

    private readonly record struct SegmentFit(
        double SlopePctPerHour,
        double RSquared,
        double StdDevPctPerHour,
        DateTime StartTimestamp,
        int PointCount);
}
