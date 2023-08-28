/**
 *****************************************
 * Created by edonet@163.com
 * Created on 2020-05-30 20:05:28
 *****************************************
 */
'use strict';


/**
 *****************************************
 * 加载依赖
 *****************************************
 */
import * as vscode from 'vscode';
import Command, { TerminalOptions } from './Command';


/**
 *****************************************
 * 命令配置
 *****************************************
 */
export interface CommandOptions {
    cmd?: string;
    command?: string;
    terminal?: string | TerminalOptions;
    appendExplorerSelectedFiles?: boolean;
}


/**
 *****************************************
 * 激活扩展
 *****************************************
 */
export function activate(context: vscode.ExtensionContext): void {

    // 注册【运行】命令
    context.subscriptions.push(
        vscode.commands.registerCommand('command-runner2.run', async (opts: CommandOptions = {}, files?: vscode.Uri[]) => {
            const command = new Command(context);
            const cmd = opts.command || opts.cmd || '';

            
            // 兼容终端名参数
            if (typeof opts.terminal === 'string') {
                opts.terminal = { name: opts.terminal };
            }

            // 添加选中的文件
            if (files && files.length) {
                files.forEach(argv => command.addFile(argv.fsPath));
            } else if (opts.appendExplorerSelectedFiles) {
                // Try to get the selected file from the explorer (Workaround)
                await vscode.commands.executeCommand('copyFilePath');
                const clipboardFiles = await vscode.env.clipboard.readText();
                clipboardFiles.split(/\r?\n/).forEach(f => command.addFile(f));
            }
            debugger;
            // 判断是否是数组类型
            // const target = command.commands[cmd]
            // debugger;
            // console.log('DEBUG ',typeof target,Array.isArray(target),target?.length,target?.args)

            // if( Array.isArray(target) ) {
            //     console.log('ISARRAY')
            //     // cmd.forEach( c => command.addFile(c) );
            //     return command.executeMultipleCommand(target, opts.terminal);
            // }
            // 执行命令
            if (cmd) {
                const cmdx = command.commands[cmd] || cmd
                if (Array.isArray(cmdx)) {
                    return command.executeMultipleCommand(cmdx, opts.terminal,cmd);
                }
                return command.execute(cmdx, opts.terminal);
            }

            // 选择命令并执行
            command.pick();
        })
    );

    // 注册【在终端运行】命令
    context.subscriptions.push(
        vscode.commands.registerCommand('command-runner2.runInTerminal', ({ terminal }: CommandOptions = {}) => {
            const command = new Command(context);

            // 兼容终端名参数
            if (typeof terminal === 'string') {
                terminal = { name: terminal };
            }

            // 执行命令
            command.executeSelectText(terminal);
        })
    );
}
