import * as vscode from "vscode";

export class DisposableStore implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  register<T extends vscode.Disposable>(disposable: T): T {
    this.disposables.push(disposable);
    return disposable;
  }

  dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
