export type OpenPathCommand = {
  command: string;
  args: string[];
  /** Windows 下 start 需要 shell，以便真正拉起资源管理器窗口 */
  shell?: boolean;
};

export function openPathCommand(target: string, platform: NodeJS.Platform = process.platform): OpenPathCommand {
  if (platform === "darwin") return { command: "open", args: [target] };
  if (platform === "win32") {
    // 直接 spawn explorer.exe 在无控制台的后台服务里常会“成功但不弹窗”。
    // 经 cmd start 拉起更稳；空标题参数避免把路径当成窗口标题。
    return { command: "cmd.exe", args: ["/c", "start", "", target], shell: false };
  }
  return { command: "xdg-open", args: [target] };
}
