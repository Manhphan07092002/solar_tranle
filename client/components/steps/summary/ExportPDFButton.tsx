import React, { useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DesignState } from '../../../types';

interface ExportPDFButtonProps {
    designData: DesignState;
    targetId: string;
}

export default function ExportPDFButton({ designData, targetId }: ExportPDFButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleExport = async () => {
        setIsGenerating(true);
        try {
            const target = document.getElementById(targetId);
            if (!target) {
                alert('Could not find report content.');
                return;
            }
            
            const originalDisplay = target.style.display;
            target.style.display = 'block';

            // Give the browser a tiny bit of time to render the block
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(target, {
                scale: 2, // higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            target.style.display = originalDisplay;

            const imgData = canvas.toDataURL('image/png');
            
            // A4 dimensions in mm: 210 x 297
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            let position = 0;
            let heightLeft = pdfHeight;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Solar_Proposal_${designData.projectDetails?.name || 'Untitled'}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('An error occurred while generating the PDF.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button 
            onClick={handleExport} 
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium text-sm transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
        >
            {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <Download size={16} />
            )}
            {isGenerating ? 'Generating...' : 'Download PDF Proposal'}
        </button>
    );
}
