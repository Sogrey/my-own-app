import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, BowlFood, ForkKnife, Copy, Target, CalendarBlank, CalendarPlus } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { MonthCalendar } from "../components/MonthCalendar";
import { addDays, classNames, localDate } from "../utils";
import { todayPlanPayload } from "../planLink";
import { Badge, Button, EmptyState, PageHeader, Section } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";
import type { WorkspaceState } from "../types";
import type { DialogState } from "./pageTypes";
import { DietDialog } from "./diet/DietDialog";
import { mealTypes } from "./diet/dietConstants";
import { nutritionDelta } from "../features/nutritionDelta";

export function DietPage() {
  const { data, run } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [date, setDate] = useState(localDate());
  const [calendarMonth, setCalendarMonth] = useState(localDate().slice(0, 7));
  const [dialog, setDialog] = useState<DialogState>(null);
  useEffect(() => { const value = params.get("new"); if (value) setDialog({ type: value }); }, [params]);
  useEffect(() => {
    const focusId = params.get("focus");
    if (!focusId) return;
    const meal = data.meals.find((item) => item.id === focusId);
    if (meal) {
      setDate(meal.meal_date || localDate());
      setCalendarMonth((meal.meal_date || localDate()).slice(0, 7));
      setDialog({ type: "meal", item: meal });
      setParams({});
      return;
    }
    const food = data.foods.find((item) => item.id === focusId);
    if (food) {
      setDialog({ type: "food", item: food });
      setParams({});
      return;
    }
    const target = data.nutritionTargets.find((item) => item.id === focusId);
    if (target) {
      setDialog({ type: "target", item: target });
      setParams({});
    }
  }, [data.foods, data.meals, data.nutritionTargets, params, setParams]);
  const close = () => { setDialog(null); setParams({}); };
  const meals = data.meals.filter((item) => item.meal_date === date).sort((a, b) => mealTypes.findIndex((type) => type.value === a.meal_type) - mealTypes.findIndex((type) => type.value === b.meal_type));
  const actualItems = useMemo(() => meals.filter((meal) => meal.entry_kind === "actual").flatMap((meal) => data.mealItems.filter((item) => item.meal_id === meal.id)), [data.mealItems, meals]);
  const totals = actualItems.reduce((result, item) => ({ calories: result.calories + Number(item.calories || 0), protein: result.protein + Number(item.protein || 0), carbs: result.carbs + Number(item.carbs || 0), fat: result.fat + Number(item.fat || 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const target = [...data.nutritionTargets].filter((item) => item.effective_date <= date).sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
  const copyYesterday = async () => {
    const yesterday = addDays(date, -1);
    const sources = data.meals.filter((item) => item.meal_date === yesterday && item.entry_kind === "planned");
    await run(async () => {
      for (const meal of sources) {
        const created = await api.create("meals", { meal_date: date, meal_type: meal.meal_type, name: meal.name, entry_kind: "planned", notes: meal.notes });
        for (const item of data.mealItems.filter((value) => value.meal_id === meal.id)) {
          await api.create("mealItems", { meal_id: created.id, food_id: item.food_id, food_name: item.food_name, quantity: item.quantity, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat });
        }
      }
    });
  };
  return (
    <div>
      <PageHeader icon={<ModuleArtwork module="diet" />} eyebrow="计划与实际摄入" title="饮食计划" description="先决定吃什么，再记录实际摄入；未知营养数据可以留空。" actions={<><Button variant="secondary" onClick={() => setDialog({ type: "food" })}><Plus size={16} />常用食物</Button><Button onClick={() => setDialog({ type: "meal" })}><ForkKnife size={17} />记录餐食</Button></>} />
      <div className="diet-toolbar"><label className="date-control"><CalendarBlank size={16} /><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setCalendarMonth(event.target.value.slice(0, 7)); }} /></label><Button variant="ghost" size="sm" onClick={() => void copyYesterday()}><Copy size={15} />复制昨天的计划</Button><Button variant="ghost" size="sm" onClick={() => setDialog({ type: "target" })}><Target size={15} />设置营养目标</Button></div>
      <Section title="饮食日历" description="按天查看计划餐食、实际摄入和已记录热量">
        <MonthCalendar month={calendarMonth} selectedDate={date} onMonthChange={setCalendarMonth} onSelectDate={(value) => { setDate(value); setCalendarMonth(value.slice(0, 7)); }} renderDay={(value) => <MealCalendarDay date={value} data={data} />} />
      </Section>
      <div className="nutrition-strip"><NutritionMetric label="热量" value={totals.calories} target={target?.calories} unit="kcal" /><NutritionMetric label="蛋白质" value={totals.protein} target={target?.protein} unit="g" /><NutritionMetric label="碳水" value={totals.carbs} target={target?.carbs} unit="g" /><NutritionMetric label="脂肪" value={totals.fat} target={target?.fat} unit="g" /></div>
      <div className="meal-columns">{mealTypes.map((type) => {
        const entries = meals.filter((meal) => meal.meal_type === type.value);
        return <Section key={type.value} title={type.label} description={entries.length ? `${entries.length} 条计划或记录` : "尚未安排"} action={<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "meal", item: { meal_type: type.value } })}><Plus size={14} /></Button>}>
          {entries.length ? <div className="meal-list">{entries.map((meal) => { const items = data.mealItems.filter((item) => item.meal_id === meal.id); return <article key={meal.id}><div className="meal-heading"><div><Badge tone={meal.entry_kind === "actual" ? "success" : "neutral"}>{meal.entry_kind === "actual" ? "实际" : "计划"}</Badge><strong>{meal.name}</strong></div><div className="meal-heading-actions"><button className="text-button" onClick={() => setDialog({ type: "mealItem", item: { meal_id: meal.id } })}>添加食物</button><button className="text-button" title="加入今日计划" onClick={() => void run(() => api.create("planItems", todayPlanPayload({ title: `饮食：${meal.name}`, sourceModule: "diet", sourceEntityType: "meal", sourceEntityId: meal.id, priority: "low" })))}><CalendarPlus size={14} />加入今日</button></div></div>{items.length ? <ul>{items.map((item) => <li key={item.id}><span>{item.food_name} × {item.quantity}</span><small>{item.calories !== null ? `${item.calories} kcal` : "营养未知"}</small></li>)}</ul> : <p>还没有食物明细</p>}</article>; })}</div> : <div className="meal-empty"><BowlFood size={24} /><span>点击添加餐食</span></div>}
        </Section>;
      })}</div>
      <Section title="常用食物" description="手动维护，运行时不依赖在线食物数据库">
        {data.foods.length ? <div className="food-chips">{data.foods.map((item) => <button key={item.id} onClick={() => setDialog({ type: "food", item })}><strong>{item.name}</strong><small>{item.calories !== null ? `${item.calories} kcal / ${item.default_portion || 1}${item.portion_unit}` : "未填写营养"}</small></button>)}</div> : <EmptyState title="还没有常用食物" description="添加经常吃的食物，之后记录会更快。" hint="营养可以先留空，只记名字也行" action={<Button variant="secondary" size="sm" onClick={() => setDialog({ type: "food" })}>添加食物</Button>} />}
      </Section>
      <DietDialog dialog={dialog} close={close} date={date} foods={data.foods} run={run} />
    </div>
  );
}

function MealCalendarDay({ date, data }: { date: string; data: WorkspaceState }) {
  const meals = data.meals.filter((meal) => meal.meal_date === date);
  if (!meals.length) return null;
  return (
    <>
      {meals.slice(0, 2).map((meal) => {
        const calories = data.mealItems.filter((item) => item.meal_id === meal.id).reduce((sum, item) => sum + Number(item.calories || 0), 0);
        const mealType = mealTypes.find((type) => type.value === meal.meal_type)?.label ?? "餐食";
        return <div className={`calendar-entry meal-${meal.entry_kind}`} key={meal.id}><strong>{meal.entry_kind === "actual" ? "实际" : "计划"} · {mealType}</strong><span>{meal.name}{calories ? ` · ${Math.round(calories)} kcal` : ""}</span></div>;
      })}
      {meals.length > 2 ? <small className="calendar-more">另有 {meals.length - 2} 餐</small> : null}
    </>
  );
}

function NutritionMetric({ label, value, target, unit }: { label: string; value: number; target?: number; unit: string }) {
  const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const delta = nutritionDelta(value, target);
  return (
    <div className={classNames("nutrition-metric", `delta-${delta.tone}`)}>
      <div>
        <span>{label}</span>
        <strong>{Math.round(value)} <small>/ {target ? Math.round(target) : "未设"} {unit}</small></strong>
        <em>{delta.label}{delta.remaining !== null && delta.tone !== "ok" ? ` ${unit}` : ""}</em>
      </div>
      <div className="mini-progress"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
