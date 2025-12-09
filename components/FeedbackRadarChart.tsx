"use client";

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

type CategoryScore = {
    category: string;
    score: number;
};

interface FeedbackRadarChartProps {
    data: CategoryScore[];
}

const FeedbackRadarChart: React.FC<FeedbackRadarChartProps> = ({ data }) => {
    // Recharts expects numeric values; we also clamp to 0–100
    const chartData = data.map((item) => ({
        subject: item.category,
        score: Math.max(0, Math.min(100, item.score)),
    }));

    return (
        <div className="w-full h-80 bg-dark-200 rounded-xl p-4">
            <h3 className="mb-2 font-semibold">Category Scores</h3>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Tooltip />
                    <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.5}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FeedbackRadarChart;
