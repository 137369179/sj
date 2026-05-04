"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

type DashboardChartsProps = {
  applications: {
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    assigned: number;
    paid: number;
  };
  stalls: {
    active: number;
    occupied: number;
  };
};

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#6366f1", "#8b5cf6"];

export function DashboardCharts({ applications, stalls }: DashboardChartsProps) {
  const applicationData = useMemo(
    () => [
      { name: "待初审", value: applications.submitted },
      { name: "审核中", value: applications.underReview },
      { name: "已通过", value: applications.approved },
      { name: "已拒绝", value: applications.rejected },
      { name: "已分配", value: applications.assigned },
      { name: "已支付", value: applications.paid }
    ].filter(item => item.value > 0),
    [applications]
  );

  const stallData = useMemo(
    () => [
      { name: "已分配", value: stalls.occupied },
      { name: "空闲", value: Math.max(0, stalls.active - stalls.occupied) }
    ],
    [stalls]
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginTop: "2rem" }}>
      <section aria-label="报名状态分布">
        <h3>报名状态分布</h3>
        {applicationData.length > 0 ? (
          <div style={{ height: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={applicationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {applicationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>暂无报名数据</p>
        )}
      </section>

      <section aria-label="摊位分配情况">
        <h3>摊位分配情况</h3>
        {stalls.active > 0 ? (
          <div style={{ height: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={stallData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {stallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#10b981" : "#e5e7eb"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>当前市集暂无启用的摊位</p>
        )}
      </section>
    </div>
  );
}