import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";

/**
 * `anni://` scheme provider
 *
 * 1. Albums
 *    - `anni://album/any/<album-id>`
 *    - `anni://album/any/<album-id>.json` // TODO: support JSON format
 *
 * 2. Tags(Planned)
 *    - `anni://tag/<tag-name>.toml`
 */
export class AnniFileSystemProvider implements vscode.FileSystemProvider {
  private _onDidChangeFile = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  readonly onDidChangeFile = this._onDidChangeFile.event;

  static parseUri(uri: vscode.Uri) {
    if (uri.authority === "album") {
      const regex = /^\/any\/([a-zA-Z0-9-]+)(\..+)?$/;
      const albumId = uri.path.match(regex)?.[1];
      if (!albumId) {
        throw new Error("Invalid album URI");
      }

      return {
        type: "album",
        albumId,
      };
    }

    throw new Error("Unknown URI");
  }

  constructor(private workspaceRoot: string) {}

  watch(
    uri: vscode.Uri,
    options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    }
  ): vscode.Disposable {
    throw new Error("Method not implemented.");
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    const { type, albumId } = AnniFileSystemProvider.parseUri(uri);
    if (type === "album") {
      return {
        type: vscode.FileType.File,
        ctime: 0,
        mtime: 0,
        size: 0,
      };
    }

    throw new Error("Unknown URI");
  }

  readDirectory(
    uri: vscode.Uri
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    throw new Error("Method not implemented.");
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    const { type, albumId } = AnniFileSystemProvider.parseUri(uri);
    if (type === "album") {
      const result = cp.spawnSync(
        "anni",
        ["repo", "print", "--type=toml", albumId],
        {
          cwd: this.workspaceRoot,
        }
      );

      return result.stdout;
    }

    throw new Error("Unknown URI");
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean }
  ): void | Thenable<void> {
    const { type, albumId } = AnniFileSystemProvider.parseUri(uri);
    if (type === "album") {
      const albumPath = cp
        .spawnSync("anni", ["repo", "print", "--type=path", albumId], {
          cwd: this.workspaceRoot,
        })
        .stdout.toString();

      // write
      fs.writeFileSync(albumPath, content);
      return;

      // TODO: support anni repo update
      //   cp.spawnSync("anni", ["repo", "update", "--type=toml", albumId], {
      //     cwd: this.workspaceRoot,
      //     input: content,
      //   });
    }

    throw new Error("Unknown URI");
  }

  delete(
    uri: vscode.Uri,
    options: { readonly recursive: boolean }
  ): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { readonly overwrite: boolean }
  ): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }
}
