import { Badge, Section } from "../../components/ui";
import { classNames } from "../../utils";
import type { MediaScheduleDay } from "../../features/mediaSchedule";
import { stageLabel } from "./mediaConstants";

type Props = {
  schedule: MediaScheduleDay[];
  today: string;
  scheduledCount: number;
  onOpen: (id: string) => void;
};

export function MediaWeekSchedule({ schedule, today, scheduledCount, onOpen }: Props) {
  return (
    <Section title="本周发布排期" description="按计划发布日期排布；未填日期的内容不会出现在这里。" action={<Badge tone="accent">{scheduledCount} 条已排期</Badge>}>
      <div className="media-schedule" role="list">
        {schedule.map((day) => {
          const isToday = day.date === today;
          const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`));
          return (
            <div className={classNames("media-schedule-day", isToday && "is-today")} key={day.date} role="listitem">
              <header><strong>{weekday}</strong><span>{day.date.slice(5)}</span></header>
              {day.items.length ? day.items.map((item) => (
                <button type="button" className="media-schedule-item" key={item.id} onClick={() => onOpen(item.id)}>
                  <strong>{item.title}</strong>
                  <small>{item.platform || "未指定平台"} · {stageLabel[String(item.stage)] || "未分阶段"}</small>
                </button>
              )) : <p className="quiet-line">空</p>}
            </div>
          );
        })}
      </div>
      {scheduledCount === 0 ? <p className="quiet-line media-schedule-hint">本周还没有排期。编辑内容时填写「计划发布日期」即可出现在对应日期。</p> : null}
    </Section>
  );
}
