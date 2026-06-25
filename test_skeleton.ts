import { calculateRoofStructureLines } from './client/utils/geometry/roofGeometry';

const pts = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 }
];

const res = calculateRoofStructureLines(pts, 'gable', 0, 0, true);
console.log(JSON.stringify(res, null, 2));
