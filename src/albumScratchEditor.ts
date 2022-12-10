import * as vscode from "vscode";

class AlbumDocument extends vscode.Disposable implements vscode.CustomDocument {
    constructor(public uri: vscode.Uri) {
        super(() => { });
    }
}

// class AlbumEditor implements vscode.CustomEditorProvider<AlbumDocument> {
//     onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<AlbumDocument>> | vscode.Event<vscode.CustomDocumentContentChangeEvent<AlbumDocument>>;

//     saveCustomDocument(document: AlbumDocument, cancellation: vscode.CancellationToken): Thenable<void> {
//         throw new Error("Method not implemented.");
//     }

//     saveCustomDocumentAs(document: AlbumDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
//         throw new Error("Method not implemented.");
//     }

//     revertCustomDocument(document: AlbumDocument, cancellation: vscode.CancellationToken): Thenable<void> {
//         throw new Error("Method not implemented.");
//     }

//     backupCustomDocument(document: AlbumDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
//         throw new Error("Method not implemented.");
//     }

//     openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): AlbumDocument | Thenable<AlbumDocument> {
//         throw new Error("Method not implemented.");
//     }

//     resolveCustomEditor(document: AlbumDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
//         throw new Error("Method not implemented.");
//     }
// }