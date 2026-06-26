import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Panel from '../models/Panel';
import Inverter from '../models/Inverter';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/web-tranle-degin';

const MODULE_DATABASE = [
  { manufacturer: 'Jinko Solar', model: 'Tiger Neo N-type 54HL4R-B', power: 440, width: 1134, height: 1722 },
  { manufacturer: 'Canadian Solar', model: 'HiKu6 Mono PERC', power: 550, width: 1134, height: 2278 },
  { manufacturer: 'Longi', model: 'Hi-MO 6 Explorer', power: 580, width: 1134, height: 2278 },
];

const INVERTER_DATABASE = [
  { manufacturer: 'SolarEdge', model: 'SE5000H', maxPowerAC: 5000, efficiency: 99.2, minStringLength: 8, maxStringLength: 25 },
  { manufacturer: 'SolarEdge', model: 'SE10000H', maxPowerAC: 10000, efficiency: 99.2, minStringLength: 10, maxStringLength: 30 },
  { manufacturer: 'Huawei', model: 'SUN2000-100KTL', maxPowerAC: 100000, efficiency: 98.8, minStringLength: 12, maxStringLength: 40 },
];

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // Check and Create Admin User
        const adminEmail = 'admin@tranle.com';
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('admin123', salt);
            
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                passwordHash,
                role: 'admin',
                isActive: true
            });
            console.log('Default Admin created: admin@tranle.com / admin123');
        } else {
            console.log('Admin already exists.');
        }

        // Seed Panels if empty
        const panelsCount = await Panel.countDocuments();
        if (panelsCount === 0) {
            await Panel.insertMany(MODULE_DATABASE);
            console.log('Panels seeded.');
        } else {
            console.log('Panels already seeded.');
        }

        // Seed Inverters if empty
        const invertersCount = await Inverter.countDocuments();
        if (invertersCount === 0) {
            await Inverter.insertMany(INVERTER_DATABASE);
            console.log('Inverters seeded.');
        } else {
            console.log('Inverters already seeded.');
        }

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Error with seeding data:', error);
        process.exit(1);
    }
};

seedData();
