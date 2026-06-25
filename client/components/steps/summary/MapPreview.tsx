import React, { useMemo } from 'react';
import { DesignState } from '../../../types';
import Full3DViewer from './Full3DViewer';

interface Props {
    designData: DesignState;
}

export default function MapPreview({ designData }: Props) {
    return <Full3DViewer designData={designData} />;
}
