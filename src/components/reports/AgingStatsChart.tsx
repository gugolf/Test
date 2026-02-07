"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AgingStatsChartProps {
    stats: {
        fresh: number;
        months1to3: number;
        months4to6: number;
        months6plus: number;
    };
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444']; // Green, Yellow, Orange, Red

export function AgingStatsChart({ stats }: AgingStatsChartProps) {
    const data = [
        { name: 'Fresh (< 1 Month)', value: stats.fresh },
        { name: '1-3 Months', value: stats.months1to3 },
        { name: '4-6 Months', value: stats.months4to6 },
        { name: '6+ Months', value: stats.months6plus },
    ].filter(item => item.value > 0);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-400">No Data Available</div>;
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
