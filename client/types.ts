export enum ProjectStatus {
  Draft = 'Draft',
  Designed = 'Designed',
  Installed = 'Installed'
}

export enum ProjectType {
  Residential = 'Residential',
  Commercial = 'Commercial'
}

export interface Project {
  id: string;
  name: string;
  address: string;
  owner: string;
  capacityKWp: number;
  lastModified: string;
  status: ProjectStatus;
  type: ProjectType;
  thumbnailUrl: string;
  designState?: DesignState;
}

// 2D Point for drawing
export interface Point {
  x: number;
  y: number;
}

// Geographic coordinate point
export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type RoofShape = 'flat' | 'gable' | 'hip' | 'shed' | 'gambrel' | 'mansard';

export interface RoofSurface {
  id: string;
  points: LatLngPoint[]; // Polygon points in geographic coordinates
  azimuth: number;
  tilt: number;
  shape?: RoofShape; // Roof shape type
  ridgeAngle?: number; // Ridge angle in degrees (for gable/hip roofs)
  ridgeDirection?: number; // Ridge direction in degrees (0-360, where 0 is North)
  baseHeight?: number; // Building height from ground to eaves (meters)
  isAnalyzed?: boolean; // True if straight skeleton has been applied
  skeletonNodes?: { x: number, y: number }[]; // Array of inner intersection points
  skeletonNodeOverrides?: Record<number, LatLngPoint>; // Replaces skeletonOffsets: LatLng overrides for dragged nodes
  deletedSkeletonNodes?: number[]; // Indices of skeleton nodes that the user has deleted
  addedSkeletonNodes?: LatLngPoint[]; // Extra points added by splitting skeleton lines
  faces?: { vertices: { x: number, y: number, z?: number }[], azimuth: number, tilt: number }[]; // Face-based data from Straight Skeleton
  structureLines?: { start: Point, end: Point, type: string }[]; // Cached straight skeleton lines
  // Face-level overrides for Auto-Split Roof (mapped by Face Index)
  faceAzimuths?: Record<number, number>;
  faceTilts?: Record<number, number>;
}

export interface Obstruction {
  id: string;
  points: LatLngPoint[]; // Polygon base in geographic coordinates
  label: string;
  height?: number; // Height in meters
  elevation?: number; // Base elevation from the ground/roof in meters
}

export interface TreeObject {
  id: string;
  position: LatLngPoint;
  radius: number;
  height: number;
}

export interface PVModule {
  id: string;
  manufacturer: string;
  model: string;
  power: number; // Watts
  width: number; // mm
  height: number; // mm
}

export interface Inverter {
  id: string;
  manufacturer: string;
  model: string;
  maxPowerAC: number; // Watts
  efficiency: number; // %
  minStringLength: number;
  maxStringLength: number;
}

export interface PVString {
  id: string;
  name: string;
  color: string;
  inverterId: string; // which inverter instance this belongs to
  mpptId?: number;
}

export interface FinancialData {
  capex: number;
  energyYieldYear1: number;
  tariff: number; // $/kWh
  roi: number; // %
  paybackPeriod: number; // Years
}

export interface MapConfig {
  lat: number;
  lng: number;
  zoom: number;
}

export interface WeatherData {
  ghi: number; // Global Horizontal Irradiance (kWh/m2/year)
  dni: number; // Direct Normal Irradiance (kWh/m2/year)
  specificYield: number; // Estimated kWh/kWp/year based on location
  locationName?: string;
}

export interface ProjectDetails {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  selectedStationId: string;
}

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

export interface GridConfig {
  gridType: string;
  powerFactor: string;
  exportLimit: boolean;
}

export interface Incentive {
  id: string;
  name: string;
  type: 'rebate' | 'tax_credit' | 'other';
  amount: number;
}

export interface DesignState {
  roofs: RoofSurface[];
  obstructions: Obstruction[];
  trees?: TreeObject[];
  modules: { xMeter: number; yMeter: number; surfaceId: string; azimuth?: number; orientation?: 'portrait' | 'landscape'; isShaded?: boolean; shadingLoss?: number; stringId?: string }[];
  strings: PVString[];
  selectedModule: PVModule | null;
  selectedInverter: Inverter | null;
  inverterCount: number;

  // New fields for Map Integration
  siteImageUrl: string | null;
  mapConfig: MapConfig | null;
  weather: WeatherData | null;

  // Step 1 Data (Persisted)
  customer: CustomerData;
  grid: GridConfig;
  notes: string;
  projectDetails: ProjectDetails;

  // Step 2: Consumption
  consumption: {
    utilityProvider: string;
    utilityRate: string;
    useIndependentExportRate: boolean;
    annualConsumption: number;
    monthlyBill: number;
    consumptionProfile: string;
    incentives?: Incentive[];
  };

  // Financial User Inputs
  financialSettings: {
    tariff: number;         // $/kWh
    systemCostPerWatt: number; // $/W
    discountRate: number;   // %
    electricityInflation: number; // %
  };

  // Step 4: PV Layout Config (persisted)
  pvLayoutConfig?: {
    rowSpacing: number;     // meters between rows
    colSpacing: number;     // meters between columns
    orientation: 'portrait' | 'landscape';
    setback: number;        // meters from roof ridge/structure lines
    sideSetback?: number;   // meters from side/eave edges of roof
    simMonth?: number;      // 1-12 for sun path simulation
    simHour?: number;       // 6-18 for sun path simulation
    showShading?: boolean;  // show/hide shading overlay
  };

  // Step 5: Electrical Config (persisted)
  electricalConfig?: {
    strings: PVString[];
    inverterCount: number;
    selectedInverterId?: string;
  };
}