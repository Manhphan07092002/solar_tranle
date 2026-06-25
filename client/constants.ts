import { Project, ProjectStatus, ProjectType, PVModule, Inverter } from './types';

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Nguyen Du 50B Villa',
    address: 'Nguyen Du 50B, 550000, Vietnam',
    owner: 'Phan Manh',
    capacityKWp: 8.5,
    lastModified: '2025-12-14T10:29:00',
    status: ProjectStatus.Draft,
    type: ProjectType.Residential,
    thumbnailUrl: 'https://picsum.photos/400/200?random=1'
  },
  {
    id: 'p2',
    name: 'CTC Factory Expansion',
    address: 'Hoa Khanh Industrial Zone, Da Nang',
    owner: 'CTC Corp',
    capacityKWp: 120.0,
    lastModified: '2025-12-09T21:15:00',
    status: ProjectStatus.Designed,
    type: ProjectType.Commercial,
    thumbnailUrl: 'https://picsum.photos/400/200?random=2'
  },
  {
    id: 'p3',
    name: 'Sunset Warehouse',
    address: 'District 9, Ho Chi Minh City',
    owner: 'Logistics VN',
    capacityKWp: 0,
    lastModified: '2025-12-01T09:00:00',
    status: ProjectStatus.Draft,
    type: ProjectType.Commercial,
    thumbnailUrl: 'https://picsum.photos/400/200?random=3'
  }
];

export const MODULE_DATABASE: PVModule[] = [
  { id: 'm1', manufacturer: 'Jinko Solar', model: 'Tiger Neo N-type 54HL4R-B', power: 440, width: 1134, height: 1722 },
  { id: 'm2', manufacturer: 'Canadian Solar', model: 'HiKu6 Mono PERC', power: 550, width: 1134, height: 2278 },
  { id: 'm3', manufacturer: 'Longi', model: 'Hi-MO 6 Explorer', power: 580, width: 1134, height: 2278 },
];

export const INVERTER_DATABASE: Inverter[] = [
  { id: 'i1', manufacturer: 'SolarEdge', model: 'SE5000H', maxPowerAC: 5000, efficiency: 99.2, minStringLength: 8, maxStringLength: 25 },
  { id: 'i2', manufacturer: 'SolarEdge', model: 'SE10000H', maxPowerAC: 10000, efficiency: 99.2, minStringLength: 10, maxStringLength: 30 },
  { id: 'i3', manufacturer: 'Huawei', model: 'SUN2000-100KTL', maxPowerAC: 100000, efficiency: 98.8, minStringLength: 12, maxStringLength: 40 },
];


export const WEATHER_STATIONS = [
  { id: 'dad', name: 'Da Nang Intl. Airp.', lat: 16.0439, lng: 108.1994 },
  { id: 'han', name: 'Noi Bai Intl. Airp. (Hanoi)', lat: 21.2187, lng: 105.8042 },
  { id: 'sgn', name: 'Tan Son Nhat Intl. Airp. (HCM)', lat: 10.8185, lng: 106.6588 },
  { id: 'cxr', name: 'Cam Ranh Intl. Airp. (Nha Trang)', lat: 11.9980, lng: 109.2194 },
  { id: 'hui', name: 'Phu Bai Intl. Airp. (Hue)', lat: 16.4000, lng: 107.7000 },
  { id: 'hph', name: 'Cat Bi Intl. Airp. (Hai Phong)', lat: 20.8188, lng: 106.7247 },
  { id: 'vca', name: 'Can Tho Intl. Airp.', lat: 10.0833, lng: 105.7119 },
  { id: 'vii', name: 'Vinh Intl. Airp.', lat: 18.7300, lng: 105.6700 },
  { id: 'dli', name: 'Lien Khuong Airp. (Da Lat)', lat: 11.7500, lng: 108.3700 },
  { id: 'vdo', name: 'Van Don Intl. Airp. (Quang Ninh)', lat: 21.1167, lng: 107.4167 },
];
