import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";

import { AnniRepoContentProvider } from "./services/repoContentProvider";

import { WorkspaceProvider } from "./tree/workspaceProvider";

async function llm(prompt: string, input: string) {
  const messages = [
    new vscode.LanguageModelChatSystemMessage(
      `${prompt} IMPORTANT respond just with JSON. NEVER not use markdown!`
    ),
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
  } catch (err) {
    // Making the chat request might fail because
    // - model does not exist
    // - user consent not given
    // - quota limits were exceeded
    if (err instanceof vscode.LanguageModelError) {
      console.error(err.message, err.code);
    }
    return;
  }

  return chatRequest.stream;
}

async function getFullString(input?: AsyncIterable<string>) {
  if (!input) {
    return "";
  }

  let fullString = "";
  for await (const chunk of input) {
    fullString += chunk;
  }
  return fullString;
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
        // 1. prompt for disc count
        const discCount = await vscode.window.showInputBox({
          title: "How many discs does this album have?",
          value: "1",
          validateInput: (v) => {
            if (parseInt(v).toString() !== v) {
              return "Please enter a valid number";
            }
            return null;
          },
        });
        if (!discCount) {
          return;
        }

        if (selected.length === 0) {
          // we should create a new album under <folder> directory
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

          // (get album data by llm)
          const folderName = path.basename(selected[0].fsPath);
          const albumDataStream = await llm(
            `Your job is to rewrite the code, read album name, release date and catalog from the data variable and output JSON object with album, release and catalog fields.
Catalog is string similiar to "TEST-123". Release date is string in format "YYYY-MM-DD", or "YYMMDD" indicating 20YY-MM-DD. Album title is the remaining part in the data.
You should always respond JSON-compatible data structure.
If any field is not detected, just ignore it.
NEVER output code to parse this format. Just output the result JSON object.
`,
            `const data = "${folderName}";`
          );
          const albumDataStr = await getFullString(albumDataStream);

          let albumName, releaseDate, catalog;
          try {
            const data: Partial<{
              album: string;
              release: string;
              catalog: string;
            }> = JSON.parse(albumDataStr);
            albumName = data.album;
            releaseDate = data.release;
            catalog = data.catalog;
            // vscode.window.showInformationMessage(
            //   `Album: ${data.album}\nRelease: ${data.release}\nCatalog: ${data.catalog}`,
            //   { modal: true }
            // );
          } catch {
            console.error(albumDataStr);
          }

          // 3. prompt for album name
          albumName = await vscode.window.showInputBox({
            title: "Album Name",
            value: albumName || folderName,
          });

          // 4. prompt for release date
          releaseDate = await vscode.window.showInputBox({
            title: "Release Date",
            value: releaseDate || "",
            validateInput: (v) => {
              if (!v.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return "Please enter a valid date in YYYY-MM-DD format";
              }
              return null;
            },
          });

          // 5. prompt for catalog
          catalog = await vscode.window.showInputBox({
            title: "Catalog",
            value: catalog || "",
          });

          // 6. rename album
          const albumPath = selected[0].fsPath;
          const targetAlbumPath = path.join(
            path.dirname(albumPath),
            `[${releaseDate}][${catalog}] ${albumName} [${discCount} Discs]`
          );
          // rename albumPath to targetAlbumPath
          fs.renameSync(albumPath, targetAlbumPath);

          // 7. create album
          cp.spawnSync("anni", [
            "ws",
            "create",
            "--disc-num",
            discCount,
            "--force",
            targetAlbumPath,
          ]);
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
