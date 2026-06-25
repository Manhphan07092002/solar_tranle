import mongoose, { Schema } from 'mongoose';

// Geographic coordinate schema (lat, lng) - used for roofs and obstructions
const LatLngPointSchema = new Schema({
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
}, { _id: false });

// Use strict: false for roof and obstruction to preserve all dynamic properties
// (skeletonNodeOverrides, faceOverrides, deletedSkeletonNodes, addedSkeletonNodes, isAnalyzed, etc)
const RoofSurfaceSchema = new Schema({
    id: { type: String, required: true },
    points: [LatLngPointSchema],
    shape: { type: String },
    azimuth: { type: Number, default: 0 },
    tilt: { type: Number, default: 0 },
    baseHeight: { type: Number, default: 3 },
    ridgeAngle: { type: Number },
    ridgeDirection: { type: Number },
    isAnalyzed: { type: Boolean, default: false },
    faceOverrides: { type: Schema.Types.Mixed, default: {} },
    deletedSkeletonNodes: { type: [Number], default: [] },
    addedSkeletonNodes: { type: Schema.Types.Mixed, default: [] },
    skeletonNodeOverrides: { type: Schema.Types.Mixed, default: {} },
}, { _id: false, strict: false });

const ObstructionSchema = new Schema({
    id: { type: String, required: true },
    points: [LatLngPointSchema],
    label: { type: String, default: '' },
    height: { type: Number, default: 2 },
    baseHeight: { type: Number, default: 0 },
    type: { type: String, default: 'obstruction' },
}, { _id: false, strict: false });

const TreeSchema = new Schema({
    id: { type: String, required: true },
    position: { type: LatLngPointSchema, required: true },
    radius: { type: Number, default: 2 },
    height: { type: Number, default: 5 }
}, { _id: false });

const ModulePlacementSchema = new Schema({
    xMeter: { type: Number, required: true },
    yMeter: { type: Number, required: true },
    surfaceId: { type: String, required: true },
    azimuth: { type: Number, default: 0 },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    isShaded: { type: Boolean, default: false },
    shadingLoss: { type: Number, default: 0 },
    stringId: { type: String }
}, { _id: false });

const PVModuleSchema = new Schema({
    id: { type: String, required: true },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    power: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
}, { _id: false });

const InverterSchema = new Schema({
    id: { type: String, required: true },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    maxPowerAC: { type: Number, required: true },
    efficiency: { type: Number, required: true }
}, { _id: false });

const MapConfigSchema = new Schema({
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    zoom: { type: Number, required: true }
}, { _id: false });

const WeatherDataSchema = new Schema({
    ghi: { type: Number, required: true },
    dni: { type: Number, required: true },
    specificYield: { type: Number, required: true },
    locationName: { type: String }
}, { _id: false });

const IncentiveSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, default: '' },
    type: { type: String, enum: ['rebate', 'tax_credit', 'other'], default: 'rebate' },
    amount: { type: Number, default: 0 }
}, { _id: false });

const ConsumptionDataSchema = new Schema({
    utilityProvider: { type: String, default: 'solar' },
    utilityRate: { type: String, default: '' },
    useIndependentExportRate: { type: Boolean, default: false },
    annualConsumption: { type: Number, default: 0 },
    monthlyBill: { type: Number, default: 0 },
    consumptionProfile: { type: String, default: '' },
    incentives: { type: [IncentiveSchema], default: () => [] }
}, { _id: false });

const FinancialSettingsSchema = new Schema({
    tariff: { type: Number, default: 0.12 },
    systemCostPerWatt: { type: Number, default: 1.5 },
    discountRate: { type: Number, default: 5 },
    electricityInflation: { type: Number, default: 3 }
}, { _id: false });

const ProjectDetailsSchema = new Schema({
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
    selectedStationId: { type: String, default: '' }
}, { _id: false });

const CustomerDataSchema = new Schema({
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    company: { type: String, default: '' }
}, { _id: false });

const GridConfigSchema = new Schema({
    gridType: { type: String, default: '400V L-L, 230V L-N' },
    powerFactor: { type: String, default: '1' },
    exportLimit: { type: Boolean, default: false }
}, { _id: false });

// PV Layout Config Schema
const PVLayoutConfigSchema = new Schema({
    rowSpacing: { type: Number, default: 0.02 },
    colSpacing: { type: Number, default: 0.02 },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    setback: { type: Number, default: 0.5 }
}, { _id: false });

const PVStringSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, default: '' },
    color: { type: String, default: '#3b82f6' },
    inverterId: { type: String, default: 'inv1' },
    mpptId: { type: Number }
}, { _id: false });

// Main DesignState Schema
const DesignStateSchema = new Schema({
    roofs: [RoofSurfaceSchema],
    obstructions: [ObstructionSchema],
    trees: { type: [TreeSchema], default: () => [] },
    modules: [ModulePlacementSchema],
    strings: { type: [PVStringSchema], default: () => [] },
    selectedModule: { type: PVModuleSchema, default: null },
    selectedInverter: { type: InverterSchema, default: null },
    inverterCount: { type: Number, default: 1 },
    siteImageUrl: { type: String, default: null },
    mapConfig: { type: MapConfigSchema, default: null },
    weather: { type: WeatherDataSchema, default: null },

    // Step 1 Data
    customer: { type: CustomerDataSchema, default: () => ({}) },
    grid: { type: GridConfigSchema, default: () => ({}) },
    notes: { type: String, default: '' },
    projectDetails: { type: ProjectDetailsSchema, default: () => ({}) },

    // Step 2 Data
    consumption: { type: ConsumptionDataSchema, default: () => ({}) },
    financialSettings: { type: FinancialSettingsSchema, default: () => ({}) },

    // Step 4: PV Layout Config
    pvLayoutConfig: { type: PVLayoutConfigSchema, default: () => ({}) }
}, { _id: false });

export { DesignStateSchema };
