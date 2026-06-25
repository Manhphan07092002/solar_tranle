import React from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ModelingHelpPanelProps {
    showHelp: boolean;
    setShowHelp: (show: boolean) => void;
}

export default function ModelingHelpPanel({ showHelp, setShowHelp }: ModelingHelpPanelProps) {
    if (!showHelp) return null;

    return (
        <div className="absolute top-16 left-4 bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-80 z-50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold flex items-center gap-2"><HelpCircle size={18} /> Modeling Guide</h3>
                <button onClick={() => setShowHelp(false)}><X size={16} /></button>
            </div>
            <div className="text-sm text-slate-600 space-y-3">
                <div>
                    <p className="font-semibold text-slate-800 mb-1">Công cụ vẽ:</p>
                    <p><strong>P</strong>: Roof | <strong>O</strong>: Obstruction | <strong>T</strong>: Tree</p>
                    <p><strong>V</strong>: Select | <strong>M</strong>: Measurement</p>
                </div>

                <div>
                    <p className="font-semibold text-slate-800 mb-1">Thao tác:</p>
                    <p><strong>Ctrl+Click</strong>: Multi-select</p>
                    <p><strong>Ctrl+C</strong>: Copy | <strong>Ctrl+V</strong>: Paste</p>
                    <p><strong>Edit Points</strong>: Click & drag to move | Double-click edge to add | Double-click point to remove</p>
                </div>

                <div className="border-t border-slate-200 pt-2">
                    <p className="font-semibold text-slate-800 mb-2">🏠 Mô phỏng hình dạng mái:</p>
                    <div className="space-y-2 text-xs">
                        <div>
                            <p className="font-semibold text-blue-600">1. Tạo mái mới:</p>
                            <p>• Click vào biểu tượng <strong>Roof (P)</strong> trên toolbar</p>
                            <p>• Click trên bản đồ để vẽ polygon (tối thiểu 3 điểm)</p>
                            <p>• Click "Finish Shape" khi hoàn thành</p>
                        </div>

                        <div>
                            <p className="font-semibold text-blue-600">2. Chọn hình dạng mái:</p>
                            <p>• Click chọn mái vừa tạo</p>
                            <p>• Trong Properties panel, chọn <strong>Roof Shape</strong>:</p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                                <li><strong>Flat</strong>: Mái phẳng (không có ridge)</li>
                                <li><strong>Gable</strong>: Mái đầu hồi (có ridge line + valley lines)</li>
                                <li><strong>Hip</strong>: Mái hông (có ridge line + hip lines)</li>
                                <li><strong>Shed</strong>: Mái dốc một phía (có high edge + valley lines)</li>
                                <li><strong>Gambrel</strong>: Mái gãy (có ridge + valley lines từ center)</li>
                                <li><strong>Mansard</strong>: Mái Mansard (có ridge + valley lines từ center)</li>
                            </ul>
                        </div>

                        <div>
                            <p className="font-semibold text-blue-600">3. Điều chỉnh thông số:</p>
                            <p>• <strong>Tilt</strong>: Độ dốc mái (0-60°)</p>
                            <p>• <strong>Azimuth</strong>: Hướng mái (0-359°)</p>
                            <p>• <strong>Ridge Angle</strong>: Góc đỉnh mái (chỉ hiện với Gable/Hip)</p>
                        </div>

                        <div>
                            <p className="font-semibold text-blue-600">4. Xem cấu trúc mái 2D:</p>
                            <p>• Các đường màu vàng/cam: <strong>Ridge lines</strong> (đỉnh mái)</p>
                            <p>• Các đường màu xanh: <strong>Valley lines</strong> (đường thung lũng)</p>
                            <p>• Các đường màu tím: <strong>Hip lines</strong> (đường hông mái)</p>
                            <p>• Khi chọn mái, sẽ hiển thị độ dài các đường cấu trúc</p>
                        </div>

                        <div>
                            <p className="font-semibold text-blue-600">5. Chế độ 3D:</p>
                            <p>• Click nút <strong>3D</strong> ở góc dưới bên phải</p>
                            <p>• Chọn công cụ <strong>Rotate</strong> (Move3d icon)</p>
                            <p>• Drag để xoay và xem hình dạng mái 3D</p>
                            <p>• Các hình dạng mái sẽ hiển thị khác nhau trong 3D</p>
                        </div>

                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <p className="font-semibold text-blue-800 text-xs">💡 Mẹo:</p>
                            <p className="text-xs">• Ridge line tự động tính từ cạnh dài nhất (Gable)</p>
                            <p className="text-xs">• Các đường cấu trúc chỉ hiển thị trong chế độ 2D</p>
                            <p className="text-xs">• Thay đổi shape sẽ tự động cập nhật cấu trúc</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
