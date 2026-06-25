import { WeatherData } from "../types";

// Using NASA POWER API (Prediction Of Worldwide Energy Resources)
// Free, public API for Renewable Energy data.
// Documentation: https://power.larc.nasa.gov/docs/services/api/
export const fetchSolarData = async (lat: number, lng: number): Promise<WeatherData> => {
  try {
    // Endpoint: Temporal Climatology (Long-term averages)
    // Parameters:
    // ALLSKY_SFC_SW_DWN: All Sky Surface Shortwave Downward Irradiance (GHI) in kWh/m²/day
    // ALLSKY_SFC_SW_DNI: All Sky Surface Shortwave Direct Normal Irradiance (DNI) in kWh/m²/day
    const params = "ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI";
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${params}&community=RE&longitude=${lng}&latitude=${lat}&format=JSON`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NASA POWER API failed with status ${response.status}`);
    }

    const data = await response.json();
    const parameters = data.properties?.parameter;

    if (!parameters || !parameters.ALLSKY_SFC_SW_DWN || !parameters.ALLSKY_SFC_SW_DNI) {
       throw new Error("Invalid data format from NASA API");
    }

    // Get Annual Averages (key 'ANN') from the response
    // Values are in kWh/m²/day
    const ghiDailyAvg = parameters.ALLSKY_SFC_SW_DWN.ANN; 
    const dniDailyAvg = parameters.ALLSKY_SFC_SW_DNI.ANN; 

    // Convert to Annual Totals (kWh/m²/year)
    // 365.25 accounts for leap years in long-term averages
    const ghiAnnual = ghiDailyAvg * 365.25;
    const dniAnnual = dniDailyAvg * 365.25;

    // Calculate Specific Yield (kWh/kWp/year)
    // Formula: Annual GHI * Performance Ratio (PR)
    // We assume a standard PR of 0.80 (80%) for a well-designed system.
    const performanceRatio = 0.80; 
    const specificYield = ghiAnnual * performanceRatio;

    return {
      ghi: Math.round(ghiAnnual),
      dni: Math.round(dniAnnual),
      specificYield: Math.round(specificYield),
      locationName: `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}`
    };

  } catch (error) {
    console.warn("Weather fetch failed, falling back to latitude-based estimation:", error);
    
    // Fallback Estimation based on Latitude if API fails (offline or limit reached)
    // Rough heuristic: Equator ~2300 kWh/m2/yr, decreasing towards poles.
    const absLat = Math.abs(lat);
    let estimatedGHI = 2300 - (absLat * 25);
    
    // Clamp minimum to avoiding negative values in extreme north/south
    if (estimatedGHI < 800) estimatedGHI = 800;
    
    // Rough ratios for DNI and Specific Yield
    const estimatedDNI = estimatedGHI * 0.7;
    const specificYield = estimatedGHI * 0.8; // 80% PR

    return {
      ghi: Math.round(estimatedGHI),
      dni: Math.round(estimatedDNI),
      specificYield: Math.round(specificYield),
      locationName: "Estimated (Offline)"
    };
  }
};