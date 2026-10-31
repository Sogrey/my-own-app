import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui";
import {
  MATRIX_QUADRANTS,
  matrixOpenCount,
  matrixQuadrantMeta,
  type MatrixBucket,
  type MatrixQuadrant,
} from "../../features/eisenhowerMatrix";
import { sourceFocusPath } from "../../moduleRoutes";
import { classNames } from "../../utils";

type Props = {
  buckets: MatrixBucket[];
  onMove: (id: string, quadrant: MatrixQuadrant) => void;
};

export function EisenhowerMatrix({ buckets, onMove }: Props) {
  const navigate = useNavigate();
  const total = matrixOpenCount(buckets);
  const byKey = Object.fromEntries(buckets.map((bucket) => [bucket.quadrant, bucket])) as Record<MatrixQuadrant, MatrixBucket>;

  return (
    <div className="eisenhower" aria-label="轻重缓急四象限">
      <div className="eisenhower-frame">
        <span className="eisenhower-label eisenhower-label-urgent" aria-hidden="true">急</span>
        <span className="eisenhower-label eisenhower-label-light" aria-hidden="true">轻</span>
        <div className="eisenhower-grid">
          <div className="eisenhower-axes" aria-hidden="true">
            <span className="eisenhower-axis-y" />
            <span className="eisenhower-axis-x" />
          </div>
          {(["delegate", "do", "park", "schedule"] as const).map((quadrant) => {
            const bucket = byKey[quadrant];
            const meta = matrixQuadrantMeta[quadrant];
            return (
              <section key={quadrant} className={classNames("eisenhower-cell", `is-${quadrant}`)} aria-label={meta.title}>
                <header>
                  <div>
                    <strong>{meta.title}</strong>
                    <small>{meta.hint}</small>
                  </div>
                  <Badge tone={quadrant === "do" ? "warning" : quadrant === "schedule" ? "accent" : "neutral"}>{bucket.items.length}</Badge>
                </header>
                {bucket.items.length ? (
                  <ul className="eisenhower-list">
                    {bucket.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="eisenhower-item"
                          onClick={() => navigate(item.source_module ? sourceFocusPath(item.source_module, item.source_entity_id) : `/today?focus=${item.id}`)}
                        >
                          <strong>{item.display_title || item.title}</strong>
                          {item.start_time ? <small>{item.start_time}</small> : null}
                        </button>
                        <label className="eisenhower-move">
                          <span className="sr-only">调整象限</span>
                          <select
                            aria-label={`将「${item.display_title || item.title}」调整到`}
                            value={quadrant}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const next = event.target.value as MatrixQuadrant;
                              if (MATRIX_QUADRANTS.includes(next) && next !== quadrant) onMove(String(item.id), next);
                            }}
                          >
                            {MATRIX_QUADRANTS.map((key) => (
                              <option key={key} value={key}>{matrixQuadrantMeta[key].title}</option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="quiet-line">空</p>
                )}
              </section>
            );
          })}
        </div>
        <span className="eisenhower-label eisenhower-label-heavy" aria-hidden="true">重</span>
        <span className="eisenhower-label eisenhower-label-later" aria-hidden="true">缓</span>
      </div>
      {total === 0 ? (
        <p className="quiet-line eisenhower-empty-hint">今天还没有未完成事项。添加计划后可按轻重缓急归类。</p>
      ) : null}
    </div>
  );
}
