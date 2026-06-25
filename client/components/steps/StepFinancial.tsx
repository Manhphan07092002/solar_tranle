import React from 'react';
import { DesignState } from '../../types';
import { useFinancial } from './financial/useFinancial';
import FinancialSettings from './financial/FinancialSettings';
import FinancialCharts from './financial/FinancialCharts';
import FinancialTable from './financial/FinancialTable';

interface StepFinancialProps {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
}

export default function StepFinancial({ designData, setDesignData }: StepFinancialProps) {
    const fin = useFinancial(designData);

    return (
        <div className="h-full overflow-hidden flex flex-col bg-slate-50">
            <FinancialSettings
                designData={designData}
                setDesignData={setDesignData}
                capacityKWp={fin.capacityKWp}
                capex={fin.capex}
                incentivesTotal={fin.incentivesTotal}
                netCapex={fin.netCapex}
                results={fin.results}
                downloadCsv={fin.downloadCsv}
            />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <FinancialCharts rows={fin.results.rows} />
                    <FinancialTable rows={fin.results.rows} netCapex={fin.netCapex} />
                </div>
            </div>
        </div>
    );
}
