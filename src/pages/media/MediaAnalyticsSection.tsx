import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Section } from "../../components/ui";
import { formatDate } from "../../utils";
import type { MediaAnalytics } from "../../features/mediaAnalytics";
import { formatCompactAxis, formatMetric } from "./mediaConstants";

export function MediaAnalyticsSection({ analytics }: { analytics: MediaAnalytics }) {
  if (!analytics.points.length) return null;
  return (
    <Section title="发布后数据" description="对比最近 12 条已发布内容的播放、点赞和评论" action={<Badge tone="accent">{analytics.points.length} 条有数据</Badge>}>
      <div className="media-analytics-grid">
        <div className="media-analytics-summary">
          <div><span>总播放 / 阅读</span><strong>{formatMetric(analytics.totals.views)}</strong><small>当前已记录内容合计</small></div>
          <div><span>平均互动率</span><strong>{analytics.engagementRate.toFixed(1)}%</strong><small>（点赞 + 评论）÷ 播放</small></div>
          <div><span>最佳表现</span><strong>{analytics.best?.title}</strong><small>{formatMetric(analytics.best?.views ?? 0)} 次播放 / 阅读</small></div>
        </div>
        <div className="media-analytics-chart" role="img" aria-label="发布后视频数据图表">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.points} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="views" tickFormatter={formatCompactAxis} tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
              <YAxis yAxisId="engagement" orientation="right" tickFormatter={formatCompactAxis} tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip content={<MediaTooltip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar yAxisId="views" dataKey="views" name="播放 / 阅读" fill="var(--accent)" radius={[5, 5, 1, 1]} maxBarSize={44} />
              <Line yAxisId="engagement" type="monotone" dataKey="likes" name="点赞" stroke="var(--success)" strokeWidth={2.2} dot={{ r: 3, fill: "var(--surface-strong)" }} />
              <Line yAxisId="engagement" type="monotone" dataKey="comments" name="评论" stroke="var(--text-soft)" strokeWidth={2} dot={{ r: 3, fill: "var(--surface-strong)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Section>
  );
}

function MediaTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="media-chart-tooltip">
      <strong>{point.title}</strong>
      {point.publishedAt ? <small>{formatDate(point.publishedAt)}</small> : null}
      <span>播放 / 阅读 {formatMetric(point.views)}</span>
      <span>点赞 {formatMetric(point.likes)}</span>
      <span>评论 {formatMetric(point.comments)}</span>
    </div>
  );
}
