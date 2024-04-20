import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";

import { AnniRepoContentProvider } from "./services/repoContentProvider";

import { WorkspaceProvider } from "./tree/workspaceProvider";
import { isNumberObject } from "util/types";

async function llm(prompt: string, input: string) {
  const messages = [
    new vscode.LanguageModelChatSystemMessage(`${prompt} IMPORTANT respond just with JSON. Do not use markdown!`),
    new vscode.LanguageModelChatUserMessage(input),
  ];

  let chatRequest: vscode.LanguageModelChatResponse;
  try {
    chatRequest = await vscode.lm.sendChatRequest(
      "copilot-gpt-4",
      messages,
      {},
      new vscode.CancellationTokenSource().token
    );
    console.log(chatRequest);
  } catch (err) {
    // Making the chat request might fail because
    // - model does not exist
    // - user consent not given
    // - quota limits were exceeded
    if (err instanceof vscode.LanguageModelError) {
      console.log(err.message, err.code);
    }
    return;
  }
  
  return chatRequest.stream;
}

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  if (rootPath) {
    vscode.commands.executeCommand("setContext", "is-in-anni-workspace", true);

    vscode.commands.registerCommand(
      "anni.workspace.create",
      async (folder: vscode.Uri, selected: vscode.Uri[]) => {

        if (selected.length === 0) {
          // we should create a new album under <folder> directory

          // 1. prompt for album name

          // 1. prompt for disc count
          const discCount = await vscode.window.showInputBox({
            title: "How many discs does this album have?",
            validateInput: (v) => {
              if (!isNumberObject(Number(v))) {
                return "Please enter a valid number";
              }
              return null;
            },
          });
          if (!discCount) {
            return;
          }

          const albumPath = path.join(folder.fsPath, "album.anni");
          cp.spawnSync("anni", [
            "ws",
            "create",
            "--disc-num",
            discCount,
            albumPath,
          ]);
        } else {
          // we should make the <selected> folder as an album
        }
      }
    );

    context.subscriptions.push(
      ...WorkspaceProvider.register(rootPath),
      vscode.workspace.registerTextDocumentContentProvider(
        "anni",
        new AnniRepoContentProvider(rootPath)
      )
    );
  }
}

export function deactivate() {}
