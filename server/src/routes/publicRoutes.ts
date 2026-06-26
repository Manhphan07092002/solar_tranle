import express from 'express';
import { Request, Response } from 'express';
import Panel from '../models/Panel';
import Inverter from '../models/Inverter';

const router = express.Router();

router.get('/panels', async (req: Request, res: Response) => {
    try {
        const panels = await Panel.find({ isActive: true }).select('-createdAt -updatedAt -__v').sort({ power: -1 });
        res.json(panels);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/inverters', async (req: Request, res: Response) => {
    try {
        const inverters = await Inverter.find({ isActive: true }).select('-createdAt -updatedAt -__v').sort({ maxPowerAC: -1 });
        res.json(inverters);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
