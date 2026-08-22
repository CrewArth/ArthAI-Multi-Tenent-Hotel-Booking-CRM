import React from "react";
import { Bar } from "react-chartjs-2";
import "./chartConfig.js";

const TopGuestHousesChart = ({ data = [], loading, rangeLabel }) => {
  const labels = data.map((item) => item.guestHouseName || "Unnamed");

  const chartData = {
    labels,
    datasets: [
      {
        label: "Bookings",
        data: data.map((item) => item.bookingCount),
        backgroundColor: "rgba(16, 185, 129, 0.65)",
        borderColor: "rgba(5, 150, 105, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.parsed.x} bookings`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="metrics-card">
      <div className="chart-header">
        <div>
          <p className="chart-label"></p>
          <h3>Most Booked Hotels</h3>
        </div>
        {rangeLabel && <span className="chart-range">{rangeLabel}</span>}
      </div>

      {loading ? (
        <p className="chart-placeholder">Loading chart…</p>
      ) : data.length === 0 ? (
        <p className="chart-placeholder">No bookings in this range</p>
      ) : (
        <div className="chart-wrapper">
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
};

export default TopGuestHousesChart;
