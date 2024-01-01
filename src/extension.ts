import * as vscode from "vscode";
import { AnniRepoContentProvider } from "./services/repoContentProvider";

import { WorkspaceProvider } from "./tree/workspaceProvider";

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  if (rootPath) {
    vscode.commands.executeCommand("setContext", "is-in-anni-workspace", true);

    vscode.commands.registerCommand("anni.workspace.create", () => { });

    context.subscriptions.push(
      ...WorkspaceProvider.register(rootPath),
      vscode.workspace.registerTextDocumentContentProvider(
        "anni",
        new AnniRepoContentProvider(rootPath)
      )
    );
  }
}

export function deactivate() { }
