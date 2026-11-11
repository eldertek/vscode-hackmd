import * as vscode from 'vscode';

import ApiClient from '@hackmd/api';

import { ACCESS_TOKEN_KEY } from './constants';
import { meStore } from './treeReactApp/store';

let API: ApiClient;

export async function initializeAPIClient(context: vscode.ExtensionContext, forceShowInputBox = false) {
  let accessToken = await context.secrets.get(ACCESS_TOKEN_KEY);
  const apiEndPoint = vscode.workspace.getConfiguration('Hackmd').get('apiEndPoint') as string;

  if (!accessToken || forceShowInputBox) {
    const input = await vscode.window.showInputBox({
      prompt: 'Please input your HackMD access token',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'Access Token',
      title: 'HackMD Access Token',
      value: accessToken,
    });

    if (!input || !input.trim()) {
      return;
    }

    accessToken = input.trim();
    await context.secrets.store(ACCESS_TOKEN_KEY, accessToken);
  }

  API = new ApiClient(accessToken, apiEndPoint, { wrapResponseErrors: false });
  try {
    await meStore.getState().refreshLogin();
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Invalid access token or network error';
    vscode.window.showErrorMessage(`HackMD authentication failed: ${message}`);
  }
}

export async function forceRefreshAPIClient(context: vscode.ExtensionContext) {
  await initializeAPIClient(context, true);
}

vscode.workspace.onDidChangeConfiguration(async (e) => {
  if (e.affectsConfiguration('Hackmd')) {
    const extension = vscode.extensions.getExtension<{ context: vscode.ExtensionContext }>('HackMD.hackmd-vscode');
    if (extension && extension.exports && extension.exports.context) {
      await initializeAPIClient(extension.exports.context);
    }
  }
});

export { API };
