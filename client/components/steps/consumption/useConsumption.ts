import React, { useState, useEffect, useCallback } from 'react';
import { DesignState } from '../../../types';

export function useConsumption(
    designData: DesignState,
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>
) {
    const [consumptionData, setConsumptionData] = useState(designData.consumption || {
        utilityProvider: 'solar',
        utilityRate: 'f2',
        useIndependentExportRate: false,
        annualConsumption: 6000,
        monthlyBill: 75,
        consumptionProfile: 'typical_family',
        incentives: [],
        monthlyConsumption: [500, 480, 450, 420, 450, 550, 650, 680, 550, 480, 450, 520]
    });

    const [showIncentives, setShowIncentives] = useState(false);

    useEffect(() => {
        setDesignData(prev => ({
            ...prev,
            consumption: consumptionData
        }));
    }, [consumptionData]);

    const tariff = Number.isFinite(designData.financialSettings?.tariff) ? designData.financialSettings.tariff : 0.15;

    const handleChange = useCallback((field: string, value: any) => {
        let newData = { ...consumptionData, [field]: value };

        if (field === 'annualConsumption') {
            const annual = value === '' ? 0 : parseFloat(value);
            newData.monthlyBill = parseFloat(((annual / 12) * tariff).toFixed(2));
            const base = annual / 12;
            newData.monthlyConsumption = [
                base * 0.9, base * 0.85, base * 0.8, base * 0.9, base * 1.1, base * 1.3,
                base * 1.4, base * 1.35, base * 1.1, base * 0.9, base * 0.85, base * 0.95
            ].map(v => parseFloat(v.toFixed(0)));
        } else if (field === 'monthlyBill') {
            const bill = value === '' ? 0 : parseFloat(value);
            newData.annualConsumption = parseFloat(((bill / tariff) * 12).toFixed(0));
            const annual = newData.annualConsumption;
            const base = annual / 12;
            newData.monthlyConsumption = [
                base * 0.9, base * 0.85, base * 0.8, base * 0.9, base * 1.1, base * 1.3,
                base * 1.4, base * 1.35, base * 1.1, base * 0.9, base * 0.85, base * 0.95
            ].map(v => parseFloat(v.toFixed(0)));
        }

        setConsumptionData(newData);
    }, [consumptionData, tariff]);

    const incentives = consumptionData.incentives || [];

    const handleAddIncentive = useCallback(() => {
        const newItem = {
            id: `inc_${Date.now()}`,
            name: 'Incentive',
            type: 'rebate' as const,
            amount: 0
        };
        setConsumptionData(prev => ({
            ...prev,
            incentives: [...(prev.incentives || []), newItem]
        }));
        setShowIncentives(true);
    }, []);

    const handleUpdateIncentive = useCallback((id: string, updates: Partial<{ name: string; type: 'rebate' | 'tax_credit' | 'other'; amount: number }>) => {
        setConsumptionData(prev => ({
            ...prev,
            incentives: (prev.incentives || []).map(i => (i.id === id ? { ...i, ...updates } : i))
        }));
    }, []);

    const handleRemoveIncentive = useCallback((id: string) => {
        setConsumptionData(prev => ({
            ...prev,
            incentives: (prev.incentives || []).filter(i => i.id !== id)
        }));
    }, []);

    const totalIncentives = incentives.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = (consumptionData.monthlyConsumption || []).map((kwh: number, i: number) => ({
        month: months[i] || `M${i + 1}`,
        kwh: kwh
    }));

    return {
        consumptionData, handleChange,
        showIncentives, setShowIncentives,
        incentives, handleAddIncentive, handleUpdateIncentive, handleRemoveIncentive,
        totalIncentives, monthlyData,
    };
}
