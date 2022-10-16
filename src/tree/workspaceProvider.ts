import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";

type WorkspaceAlbum = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  album_id: string;
} & (
  | {
      type: "untracked" | "committed" | "dangling";
      path: string;
    }
  | { type: "garbage" }
);

export class WorkspaceProvider
  implements vscode.TreeDataProvider<WorkspaceAlbum>
{
  private albums: WorkspaceAlbum[];

  constructor(private workspaceRoot: string) {
    const result = cp.spawnSync("anni", ["status", "--json"], {
      cwd: workspaceRoot,
    });
    const json = result.stdout.toString();
    this.albums = JSON.parse(json);
    this.albums.forEach((album) => {
      if (album.type !== "garbage") {
        album.path = "/" + path.relative(workspaceRoot, album.path);
      }
    });
  }

  getTreeItem(element: WorkspaceAlbum): vscode.TreeItem {
    let item;
    switch (element.type) {
      case "committed":
        item = new vscode.TreeItem(path.basename(element.path));
        item.iconPath = vscode.ThemeIcon.File;
        item.resourceUri = vscode.Uri.parse("_.flac");
        item.tooltip = element.path;
        break;
      case "dangling":
      case "untracked":
        item = new vscode.TreeItem(element.path);
        item.iconPath = new vscode.ThemeIcon("files");
        break;
      case "garbage":
        item = new vscode.TreeItem(element.album_id.substring(0, 8));
        item.iconPath = new vscode.ThemeIcon("bug");
        break;
    }
    item.contextValue = element.type;
    return item;
  }

  async getChildren(element?: WorkspaceAlbum): Promise<WorkspaceAlbum[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No workspace open");
      return [];
    }

    if (typeof element === "undefined") {
      return this.albums;
    }

    return [];
  }

  static register(rootPath: string) {
    const disposable = [];

    disposable.push(
      vscode.window.registerTreeDataProvider(
        "anni.workspaceView",
        new WorkspaceProvider(rootPath)
      )
    );

    disposable.push(
      vscode.commands.registerCommand(
        "anni.workspaceView.commit",
        (...args: any[]) => {
          console.log(args);
        }
      )
    );

    disposable.push(
      vscode.commands.registerCommand(
        "anni.workspaceView.delete",
        (...args: any[]) => {
          console.log(args);
        }
      )
    );
    return disposable;
  }
}
