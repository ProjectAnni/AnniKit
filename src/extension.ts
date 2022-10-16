import * as vscode from "vscode";

import { WorkspaceProvider } from "./tree/workspaceProvider";

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  if (rootPath) {
    vscode.commands.executeCommand("setContext", "is-in-anni-workspace", true);
    context.subscriptions.push(...WorkspaceProvider.register(rootPath));
  }
}

export function deactivate() {}
