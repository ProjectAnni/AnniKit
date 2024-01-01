import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";

interface IDisposable {
  dispose(): void;
}

type WorkspaceAlbumType = WorkspaceValidAlbumType | WorkspaceGarbageAlbumType;

type WorkspaceValidAlbumType = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  album_id: string;
  type: "untracked" | "committed" | "dangling";
  path: string;
};

type WorkspaceGarbageAlbumType = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  album_id: string;
  type: "garbage";
};

class WorkspaceAlbum extends vscode.TreeItem {
  album: WorkspaceValidAlbumType;

  constructor(album: WorkspaceValidAlbumType) {
    switch (album.type) {
      case "committed":
        super(path.basename(album.path));
        this.iconPath = vscode.ThemeIcon.File;
        this.resourceUri = vscode.Uri.parse("_.flac");
        this.tooltip = album.path;
        this.command = {
          title: "Play",
          command: "vscode.open",
          arguments: [
            vscode.Uri.parse("anni://" + album.album_id)
              // notice: /root/ prefix must exist here, or vscode will never load some albums
              // .with({ path: "/test.toml" }),
              .with({ path: `/root/${album.path}.toml` }),
            { preview: true },
            path.basename(album.path),
          ],
        };
        break;
      case "dangling":
      case "untracked":
        super(album.path);
        this.iconPath = new vscode.ThemeIcon("files");
        break;
      default:
        super("unreachable");
        break;
    }
    this.album = album;
    this.contextValue = album.type;
  }
}

class WorkspaceDirectory extends vscode.TreeItem {
  path: string[];
  constructor(path: string[]) {
    super(path[path.length - 1], vscode.TreeItemCollapsibleState.Collapsed);
    this.path = path;
    this.contextValue = "directory";
  }
}

type WorkspaceItem = WorkspaceAlbum | WorkspaceDirectory;

type PathObject<T> = { [key: string]: T | PathObject<T> };

export class WorkspaceProvider
  implements vscode.TreeDataProvider<WorkspaceItem>
{
  private albums: PathObject<WorkspaceAlbum>;

  disposables: IDisposable[] = [];

  constructor(private workspaceRoot: string) {
    const result = cp.spawnSync("anni", ["workspace", "status", "--json"], {
      cwd: workspaceRoot,
    });
    const json = result.stdout.toString();
    const albums: WorkspaceAlbumType[] = JSON.parse(json);
    albums.forEach((album) => {
      if (album.type !== "garbage") {
        album.path = path.relative(workspaceRoot, album.path);
      }
    });

    const validAlbums = albums.filter(
      (a) => a.type !== "garbage"
    ) as WorkspaceValidAlbumType[];
    this.albums = {};
    validAlbums.forEach((album) => {
      const parts = album.path.split(path.sep);
      let current = this.albums;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current[parts[i]] === "undefined") {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as PathObject<WorkspaceAlbum>;
      }
      current[parts[parts.length - 1]] = new WorkspaceAlbum(album);
    });


    const scm = vscode.scm.createSourceControl("anni", "Anni", vscode.Uri.file(workspaceRoot));
    this.disposables.push(scm);

    const committedGroup = scm.createResourceGroup("committed", "Committed");
    this.disposables.push(committedGroup);
    committedGroup.hideWhenEmpty = true;
    const committedAlbums = albums.filter(a => a.type === "committed") as WorkspaceValidAlbumType[];
    committedGroup.resourceStates = committedAlbums.map((a) => ({
      resourceUri: vscode.Uri.file(a.path),
      command: {
        title: 'Open metadata',
        command: 'vscode.open',
        arguments: [
          vscode.Uri.parse("anni://" + a.album_id)
            // notice: /root/ prefix must exist here, or vscode will never load some albums
            // .with({ path: "/test.toml" }),
            .with({ path: `/root/${a.path}.toml` }),
          // { preview: false },
          // path.basename(a.path),
        ],
      },
      decorations: { tooltip: path.basename(a.path), iconPath: new vscode.ThemeIcon("music") }
    }));

    const untrackedGroup = scm.createResourceGroup("untracked", "Untracked");
    this.disposables.push(untrackedGroup);
    untrackedGroup.hideWhenEmpty = true;
    const untrackedAlbums = albums.filter(a => a.type === "untracked") as WorkspaceValidAlbumType[];
    untrackedGroup.resourceStates = untrackedAlbums.map((a) => ({ resourceUri: vscode.Uri.file(a.path) }));
  }

  getTreeItem(element: WorkspaceItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: WorkspaceItem): Promise<WorkspaceItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No workspace open");
      return [];
    }

    if (typeof element === "undefined") {
      return Object.entries(this.albums)
        .map(([key, album]) => {
          if (album instanceof WorkspaceAlbum) {
            return album;
          } else {
            return new WorkspaceDirectory([key]);
          }
        })
        .sort(sortWorkspaceItem);
    } else {
      if (element instanceof WorkspaceDirectory) {
        let current = this.albums;
        for (const part of element.path) {
          current = current[part] as PathObject<WorkspaceAlbum>;
        }

        return Object.entries(current)
          .map(([key, album]) => {
            if (album instanceof WorkspaceAlbum) {
              return album;
            } else {
              return new WorkspaceDirectory([...element.path, key]);
            }
          })
          .sort(sortWorkspaceItem);
      } else {
        // album insights
        const path = element.album.path;
      }
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

function sortWorkspaceItem(a: WorkspaceItem, b: WorkspaceItem) {
  if (a instanceof WorkspaceDirectory && b instanceof WorkspaceAlbum) {
    return -1;
  } else if (a instanceof WorkspaceAlbum && b instanceof WorkspaceDirectory) {
    return 1;
  } else {
    return a.label! < b.label! ? -1 : 1;
  }
}
