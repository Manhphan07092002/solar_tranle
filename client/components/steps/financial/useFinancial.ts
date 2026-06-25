import { useMemo } from 'react';
import { DesignState } from '../../../types';

export function useFinancial(designData: DesignState) {
    const settings = designData.financialSettings;

    const incentivesTotal = useMemo(() => {
        const list = designData.consumption?.incentives || [];
        return list.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0);
    }, [designData.consumption]);

    const dcWatts = useMemo(() => {
        return (designData.modules?.length || 0) * (designData.selectedModule?.power || 0);
    }, [designData.modules, designData.selectedModule]);

    const capacityKWp = useMemo(() => dcWatts / 1000, [dcWatts]);

    const specificYield = useMemo(() => {
        const val = designData.weather?.specificYield;
        return Number.isFinite(val) && (val as number) > 0 ? (val as number) : 1400;
    }, [designData.weather]);

    const annualConsumptionKwh = useMemo(() => {
        const v = designData.consumption?.annualConsumption;
        return Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0;
    }, [designData.consumption]);

    const capex = useMemo(() => {
        const costPerW = Number.isFinite(settings?.systemCostPerWatt) ? settings.systemCostPerWatt : 1.1;
        return dcWatts * costPerW;
    }, [dcWatts, settings]);

    const netCapex = useMemo(() => Math.max(0, capex - incentivesTotal), [capex, incentivesTotal]);

    const discountRate = useMemo(() => ((Number.isFinite(settings?.discountRate) ? settings.discountRate : 5) / 100), [settings]);
    const inflationRate = useMemo(() => ((Number.isFinite(settings?.electricityInflation) ? settings.electricityInflation : 3) / 100), [settings]);
    const tariff = useMemo(() => (Number.isFinite(settings?.tariff) ? settings.tariff : 0.15), [settings]);

    const npvAtRate = (rate: number, flows: number[]) => {
        let total = 0;
        for (let t = 0; t < flows.length; t++) {
            total += flows[t] / Math.pow(1 + rate, t);
        }
        return total;
    };

    const computeIrr = (flows: number[]) => {
        let low = -0.9;
        let high = 1.0;
        const fLow = npvAtRate(low, flows);
        const fHigh = npvAtRate(high, flows);
        if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) return null;

        for (let i = 0; i < 60; i++) {
            const mid = (low + high) / 2;
            const fMid = npvAtRate(mid, flows);
            if (!Number.isFinite(fMid)) return null;
            if (Math.abs(fMid) < 1e-6) return mid;
            if (fLow * fMid <= 0) {
                high = mid;
            } else {
                low = mid;
            }
        }
        return (low + high) / 2;
    };

    const results = useMemo(() => {
        const years = 25;
        const degradation = 0.005;
        const maintenanceRate = 0.01;

        const flows: number[] = [];
        flows.push(-netCapex);

        const rows: Array<{ year: number; production: number; savings: number; maintenance: number; netCashFlow: number; cumulativeCashFlow: number }> = [];
        let cumulative = -netCapex;
        for (let y = 1; y <= years; y++) {
            const degFactor = Math.pow(1 - degradation, y - 1);
            const production = capacityKWp * specificYield * degFactor;
            const usable = Math.min(annualConsumptionKwh, production);
            const effectiveTariff = tariff * Math.pow(1 + inflationRate, y - 1);
            const savings = usable * effectiveTariff;
            const maintenance = capex * maintenanceRate;
            const net = savings - maintenance;
            cumulative += net;
            flows.push(net);
            rows.push({ year: y, production, savings, maintenance, netCashFlow: net, cumulativeCashFlow: cumulative });
        }

        const npv = npvAtRate(discountRate, flows);
        const irr = computeIrr(flows);

        const paybackYear = (() => {
            for (const r of rows) {
                if (r.cumulativeCashFlow >= 0) return r.year;
            }
            return null;
        })();

        const lifetimeNet = rows.reduce((sum, r) => sum + r.netCashFlow, -netCapex);
        const roi = netCapex > 0 ? (lifetimeNet / netCapex) * 100 : 0;

        return { rows, npv, irr, paybackYear, lifetimeNet, roi };
    }, [annualConsumptionKwh, capex, capacityKWp, discountRate, inflationRate, netCapex, specificYield, tariff]);

    const downloadCsv = () => {
        const header = ['year', 'savings', 'maintenance', 'netCashFlow', 'cumulativeCashFlow'];
        const lines = [header.join(',')];
        for (const r of results.rows) {
            lines.push([
                r.year,
                r.savings.toFixed(2),
                r.maintenance.toFixed(2),
                r.netCashFlow.toFixed(2),
                r.cumulativeCashFlow.toFixed(2)
            ].join(','));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financial-analysis.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return {
        settings, incentivesTotal, capacityKWp, capex, netCapex, results, downloadCsv,
    };
}
