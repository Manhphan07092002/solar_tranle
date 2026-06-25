import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Project from '../src/models/Project';

dotenv.config();

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/web-tranle-degin';

type LatLngPoint = { lat: number; lng: number };

const nowIso = () => new Date().toISOString();

const seedProjects = () => {
  const roof1: LatLngPoint[] = [
    { lat: 10.77655, lng: 106.70095 },
    { lat: 10.77655, lng: 106.70125 },
    { lat: 10.77635, lng: 106.70125 },
    { lat: 10.77635, lng: 106.70095 }
  ];

  const obs1: LatLngPoint[] = [
    { lat: 10.77648, lng: 106.70105 },
    { lat: 10.77648, lng: 106.70110 },
    { lat: 10.77643, lng: 106.70110 },
    { lat: 10.77643, lng: 106.70105 }
  ];

  return [
    {
      id: 'seed-001',
      name: 'Seed Project - Residential 01',
      address: 'District 1, Ho Chi Minh City',
      owner: 'Demo User',
      type: 'Residential' as const,
      thumbnailUrl: '',
      status: 'Draft' as const,
      lastModified: new Date(),
      capacityKWp: 0,
      designState: {
        roofs: [
          {
            id: 'r-seed-1',
            points: roof1,
            azimuth: 180,
            tilt: 20
          }
        ],
        obstructions: [
          {
            id: 'o-seed-1',
            points: obs1,
            label: 'Obstruction'
          }
        ],
        modules: [
          { x: 120, y: 140, surfaceId: 'r-seed-1', isShaded: false },
          { x: 160, y: 140, surfaceId: 'r-seed-1', isShaded: false }
        ],
        selectedModule: {
          id: 'mod-seed-1',
          manufacturer: 'Demo',
          model: 'Demo-450',
          power: 450,
          width: 1.05,
          height: 2.1
        },
        selectedInverter: {
          id: 'inv-seed-1',
          manufacturer: 'Demo',
          model: 'Demo-5k',
          maxPowerAC: 5000,
          efficiency: 0.98
        },
        inverterCount: 1,
        siteImageUrl: null,
        mapConfig: { lat: 10.77645, lng: 106.70110, zoom: 19 },
        weather: { ghi: 1800, dni: 1600, specificYield: 1400, locationName: 'HCM' },
        customer: { firstName: 'Nguyen', lastName: 'A', email: 'demo@example.com', company: '' },
        grid: { gridType: '400V L-L, 230V L-N', powerFactor: '1', exportLimit: false },
        notes: 'Seed data - you can edit and it should auto-save to MongoDB.',
        projectDetails: {
          name: 'Seed Project - Residential 01',
          address: 'District 1, Ho Chi Minh City',
          city: 'Ho Chi Minh City',
          zipCode: '700000',
          country: 'VN',
          selectedStationId: ''
        },
        consumption: {
          utilityProvider: 'solar',
          utilityRate: '0.15',
          useIndependentExportRate: false,
          annualConsumption: 6500,
          monthlyBill: 90,
          consumptionProfile: 'standard'
        },
        financialSettings: {
          tariff: 0.15,
          systemCostPerWatt: 1.1,
          discountRate: 5,
          electricityInflation: 3
        }
      }
    },
    {
      id: 'seed-002',
      name: 'Seed Project - Commercial 01',
      address: 'Thu Duc City, Ho Chi Minh City',
      owner: 'Demo Company',
      type: 'Commercial' as const,
      thumbnailUrl: '',
      status: 'Draft' as const,
      lastModified: new Date(),
      capacityKWp: 0,
      designState: {
        roofs: [],
        obstructions: [],
        modules: [],
        selectedModule: null,
        selectedInverter: null,
        inverterCount: 1,
        siteImageUrl: null,
        mapConfig: { lat: 10.8500, lng: 106.8000, zoom: 18 },
        weather: null,
        customer: { firstName: '', lastName: '', email: '', company: 'Demo Company' },
        grid: { gridType: '400V L-L, 230V L-N', powerFactor: '1', exportLimit: false },
        notes: 'Commercial seed project.',
        projectDetails: {
          name: 'Seed Project - Commercial 01',
          address: 'Thu Duc City, Ho Chi Minh City',
          city: 'Ho Chi Minh City',
          zipCode: '700000',
          country: 'VN',
          selectedStationId: ''
        },
        consumption: {
          utilityProvider: 'solar',
          utilityRate: '0.12',
          useIndependentExportRate: false,
          annualConsumption: 120000,
          monthlyBill: 1500,
          consumptionProfile: 'commercial'
        },
        financialSettings: {
          tariff: 0.12,
          systemCostPerWatt: 1.0,
          discountRate: 6,
          electricityInflation: 3
        }
      }
    }
  ];
};

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');

  console.log(`[seed] Connecting to MongoDB: ${mongoURI}`);
  await mongoose.connect(mongoURI);

  const projects = seedProjects();
  const ids = projects.map(p => p.id);

  if (reset) {
    console.log('[seed] --reset enabled. Deleting existing seed projects:', ids);
    await Project.deleteMany({ id: { $in: ids } });
  }

  console.log('[seed] Upserting seed projects:', ids);

  for (const p of projects) {
    await Project.findOneAndUpdate(
      { id: p.id },
      {
        $set: {
          ...p,
          lastModified: new Date(),
          // keep a predictable modified date as well
          updatedAt: nowIso()
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log('[seed] Done.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed] Failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
