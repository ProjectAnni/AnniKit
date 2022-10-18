import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";

export class AnniRepoContentProvider implements vscode.TextDocumentContentProvider {
    constructor(private workspaceRoot: string) { }

    provideTextDocumentContent(uri: vscode.Uri): vscode.ProviderResult<string> {
        const albumId = uri.authority;
        const result = cp.spawnSync("anni", ["repo", "--root", path.join(this.workspaceRoot, ".anni/repo"), "print", "--type=toml", albumId], {
            cwd: this.workspaceRoot,
        });

        return result.stdout.toString();
    }

    onDidChange?: vscode.Event<vscode.Uri> | undefined;
}