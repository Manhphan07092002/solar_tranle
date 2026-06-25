import React from 'react';
import { DesignState } from '../../types';
import { useConsumption } from './consumption/useConsumption';
import ConsumptionEnergyCost from './consumption/ConsumptionEnergyCost';
import ConsumptionProfile from './consumption/ConsumptionProfile';

interface StepConsumptionProps {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
}

export default function StepConsumption({ designData, setDesignData }: StepConsumptionProps) {
    const c = useConsumption(designData, setDesignData);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ConsumptionEnergyCost
                consumptionData={c.consumptionData}
                handleChange={c.handleChange}
                showIncentives={c.showIncentives}
                setShowIncentives={c.setShowIncentives}
                incentives={c.incentives}
                handleAddIncentive={c.handleAddIncentive}
                handleUpdateIncentive={c.handleUpdateIncentive}
                handleRemoveIncentive={c.handleRemoveIncentive}
                totalIncentives={c.totalIncentives}
            />

            <ConsumptionProfile
                consumptionData={c.consumptionData}
                handleChange={c.handleChange}
                monthlyData={c.monthlyData}
            />
        </div>
    );
}
