import { CheckCircle } from "@phosphor-icons/react";

/** 本地服务已安全关闭后的全屏提示。 */
export function ExitScreen() {
  return (
    <div className="exit-screen" role="status">
      <div className="exit-card">
        <CheckCircle size={32} weight="fill" />
        <strong>数据已保存，木子工作台已安全退出</strong>
        <p>现在可以关闭这个页面。下次双击启动图标，会重新启动并打开工作台。</p>
      </div>
    </div>
  );
}
