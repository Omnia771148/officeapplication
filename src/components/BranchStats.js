'use client';

import { useState, useEffect } from 'react';
import './BranchStats.css';

export default function BranchStats({ restaurantId, onFssaiLoaded, onDetailsLoaded }) {
    const [stats, setStats] = useState([]);
    const [fssai, setFssai] = useState('');
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', value: '' });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/branch-stats?restaurantId=${restaurantId}`);
                const data = await res.json();
                if (data.success) {
                    setStats(data.data);
                    setFssai(data.fssai || 'N/A');
                    if (onFssaiLoaded) {
                        onFssaiLoaded(data.fssai || 'N/A');
                    }
                    if (onDetailsLoaded) {
                        onDetailsLoaded(data.restaurantDetails || null);
                    }
                }
            } catch (err) {
                console.error("Error fetching branch stats:", err);
            } finally {
                setLoading(false);
            }
        };

        if (restaurantId) {
            localStorage.setItem('restaurantId', restaurantId);
            fetchStats();
        }
    }, [restaurantId]);

    if (loading) {
        return (
            <div className="statsContainer">
                <div className="statsLoading">Loading Stats...</div>
            </div>
        );
    }

    if (!stats || stats.length === 0) {
        return (
            <div className="statsContainer">
                <div className="noStatsData">No order history available.</div>
            </div>
        );
    }

    // Calculations
    const totalOrders = stats.reduce((acc, curr) => acc + curr.count, 0);
    const totalRevenue = stats.reduce((acc, curr) => acc + curr.revenue, 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // SVG parameters
    const width = 400;
    const height = 180;
    const padding = 30;

    // Max values for scaling
    const maxCount = Math.max(...stats.map(s => s.count), 5); // Fallback to 5 to avoid divide by zero or tiny scales
    const maxRevenue = Math.max(...stats.map(s => s.revenue), 100);

    const handleMouseOver = (e, title, value) => {
        const rect = e.target.getBoundingClientRect();
        const containerRect = e.currentTarget.ownerDocument.body.getBoundingClientRect();
        setTooltip({
            visible: true,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 45,
            title,
            value
        });
    };

    const handleMouseOut = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
        <div className="statsContainer">
            <h2 className="statsTitle">
                📊 Last 7 Days Performance
            </h2>


            <div className="statsGrid">
                <div className="summaryCard orders">
                    <span className="cardLabel">Total Orders</span>
                    <span className="cardValue">{totalOrders}</span>
                </div>
                <div className="summaryCard revenue">
                    <span className="cardLabel">Total Revenue</span>
                    <span className="cardValue">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="summaryCard average">
                    <span className="cardLabel">Avg. Order Value</span>
                    <span className="cardValue">₹{averageOrderValue.toLocaleString()}</span>
                </div>
            </div>

            <div className="chartsWrapper">
                {/* Orders Bar Chart */}
                <div className="chartCard">
                    <div className="chartHeader">
                        <h3 className="chartTitle">Order Count</h3>
                        <p className="chartSubtitle">Number of completed orders per day</p>
                    </div>
                    <div className="chartBody">
                        <svg className="chartSvg" viewBox={`0 0 ${width} ${height}`}>
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                                const y = padding + (height - 2 * padding) * ratio;
                                return (
                                    <line
                                        key={index}
                                        x1={padding}
                                        y1={y}
                                        x2={width - padding}
                                        y2={y}
                                        className="gridLine"
                                    />
                                );
                            })}

                            {/* Bars */}
                            {stats.map((day, index) => {
                                const columnWidth = (width - 2 * padding) / stats.length;
                                const barWidth = columnWidth * 0.6;
                                const x = padding + index * columnWidth + (columnWidth - barWidth) / 2;
                                
                                const barHeight = ((height - 2 * padding) * day.count) / maxCount;
                                const y = height - padding - barHeight;

                                return (
                                    <g key={index} className="chartGroup">
                                        <rect
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={Math.max(barHeight, 2)}
                                            fill="url(#ordersGradient)"
                                            rx="4"
                                            className="barElement"
                                            onMouseOver={(e) => handleMouseOver(e, day.dateLabel, `${day.count} orders`)}
                                            onMouseOut={handleMouseOut}
                                        />
                                        {/* X Axis Label */}
                                        <text
                                            x={x + barWidth / 2}
                                            y={height - padding + 15}
                                            className="chartLabel"
                                        >
                                            {day.dateLabel}
                                        </text>
                                    </g>
                                );
                            })}
                            
                            <defs>
                                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#009688" />
                                    <stop offset="100%" stopColor="#00796b" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                {/* Revenue Line/Area Chart */}
                <div className="chartCard">
                    <div className="chartHeader">
                        <h3 className="chartTitle">Revenue</h3>
                        <p className="chartSubtitle">Daily sales earnings in INR</p>
                    </div>
                    <div className="chartBody">
                        <svg className="chartSvg" viewBox={`0 0 ${width} ${height}`}>
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                                const y = padding + (height - 2 * padding) * ratio;
                                return (
                                    <line
                                        key={index}
                                        x1={padding}
                                        y1={y}
                                        x2={width - padding}
                                        y2={y}
                                        className="gridLine"
                                    />
                                );
                            })}

                            {/* Line & Points */}
                            {(() => {
                                const points = stats.map((day, index) => {
                                    const columnWidth = (width - 2 * padding) / stats.length;
                                    const x = padding + index * columnWidth + columnWidth / 2;
                                    const y = height - padding - (((height - 2 * padding) * day.revenue) / maxRevenue);
                                    return { x, y, day };
                                });

                                const d = points.reduce((acc, point, index) => {
                                    return acc + `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
                                }, '');

                                // Path for Area under line
                                const areaD = points.length > 0 
                                    ? `${d} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
                                    : '';

                                return (
                                    <>
                                        {points.length > 0 && (
                                            <>
                                                <path d={areaD} className="chartArea revenueArea" />
                                                <path d={d} className="chartLine revenueLine" />
                                            </>
                                        )}
                                        {points.map((point, index) => (
                                            <g key={index} className="chartGroup">
                                                <circle
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r="5"
                                                    className="chartPoint revenuePoint"
                                                    onMouseOver={(e) => handleMouseOver(e, point.day.dateLabel, `₹${point.day.revenue.toLocaleString()}`)}
                                                    onMouseOut={handleMouseOut}
                                                />
                                                <text
                                                    x={point.x}
                                                    y={height - padding + 15}
                                                    className="chartLabel"
                                                >
                                                    {point.day.dateLabel}
                                                </text>
                                            </g>
                                        ))}
                                    </>
                                );
                            })()}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Tooltip Overlay */}
            {tooltip.visible && (
                <div 
                    className="chartTooltip visible"
                    style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
                >
                    <div className="tooltipDate">{tooltip.title}</div>
                    <div style={{ fontWeight: 'bold' }}>{tooltip.value}</div>
                </div>
            )}
        </div>
    );
}
