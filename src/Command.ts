/**
 *****************************************
 * Created by edonet@163.com
 * Created on 2020-08-15 21:18:39
 *****************************************
 */
'use strict';


/**
 *****************************************
 * 加载依赖
 *****************************************
 */
import * as vscode from 'vscode';
import replace from './helpers/replace';
import Accessor, { VariableScope } from './Accessor';

/**
 *****************************************
 * 命令执行参数
 *****************************************
 */
export type TerminalOptions = Partial<vscode.TerminalOptions> & {
    autoFocus?: boolean;
    autoClear?: boolean;
    sorted?: string[];
};


/**
 *****************************************
 * 创建终端
 *****************************************
 */
function createTerminal(options: vscode.TerminalOptions):vscode.Terminal {
    const { window } = vscode;
    const { name } = options;

    // 指定终端
    if (name && typeof name === 'string') {
        return (
            window.terminals.find(term => term.name === name) ||
            window.createTerminal(options)
        );
    }

    // 使用默认终端
    return window.activeTerminal || window.createTerminal(options);
}


/**
 *****************************************
 * 命令行工具
 *****************************************
 */
export default class Command {

    /* 上下文 */
    private context: vscode.ExtensionContext;

    /* 选中的文件列表 */
    private $files: string[] = [];

    /* 存取器 */
    private $accessor = new Accessor();

    /* 初始化对象 */
    public constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /* 获取命令 */
    public get commands() {
        return this.$accessor.commands();
    }

    /* 添加文件 */
    public addFile(file?: string) {
        file && this.$files.push(JSON.stringify(file));
    }

    /* 解析命令 */
    public async resolve(cmd: string, predefined: Record<string, string> = {}): Promise<string> {
        return cmd && replace(cmd, async str => {
            let [variable, args = ''] = str.split(':');

            // 去除空白
            variable = variable.trim();
            args = args.trim();

            // 解析预设变量
            if (predefined[variable]) {
                return predefined[variable];
            }

            // 解析变量
            switch (variable) {
                case 'config':
                    return args && this.$accessor.config(args) as string;
                case 'env':
                    return args && this.$accessor.env(args);
                case 'input':
                    return await this.$accessor.input(args) || args;
                case 'command':
                    return args && await vscode.commands.executeCommand(args) || '';
                default:
                    return this.$accessor.variable(variable as VariableScope);
            }
        });
    }

    /* 选择命令并执行 */
    public async pick(options?: TerminalOptions) {
        const commands = this.$accessor.commands();
        const keys = Object.keys(commands);

        // 命令列表为空
        if (!keys.length) {

            // 添加默认命令
            keys.push('This is an example as `echo "${workspaceFolder}"`');

            // 设置默认命令语句
            commands['This is an example as `echo "${workspaceFolder}"`'] = 'echo "${workspaceFolder}"';
        }

        // 获取最近列表
        const recent = this.context.workspaceState.get('COMMAND_RUNNER_RECENT', [] as string[]);

        // 根据最近列表排序
        if (recent && recent.length) {
            keys.unshift.apply(keys, recent.filter(key => {
                const idx = keys.indexOf(key);

                // 存在命令
                if (idx > -1) {
                    return keys.splice(idx, 1);
                }
            }));
        }

        // 显示选择列表
        try {
            const cmd = await vscode.window.showQuickPick(
                keys, { placeHolder: 'Type or select command to run' }
            );
            // debugger;
            // 缓存最近列表
            this.context.workspaceState.update('COMMAND_RUNNER_RECENT', [cmd, ...keys]);
            if (!cmd) {
                return
            }
            const target = commands[cmd]
            // 执行命令
            if (Array.isArray(target)) {
                await this.executeMultipleCommand(target, options);
            } else {
                await this.execute(target, options);
            }


        } catch (err) {
            // do nothings;
        }
    }
    // 执行一组命令
    public async executeMultipleCommand(commands: string[], options?: TerminalOptions) {
        // for (let  i=0;i<commands.length;i++) {
        //     // options?.autoClear = true
        //     await this.execute(commands[i], options);
        // }
        const { autoClear, autoFocus, ...terminalOptions }: TerminalOptions = {
            ...this.$accessor.config('command-runner.terminal'),
            ...options,
            hideFromUser: false,
        };


        // 预设数据
        const predefined = {
            selectedFile: this.$files[0] || '',
            selectedFiles: this.$files.join(' '),
        };
        if (commands == null || commands.length == 0) {
            return
        }
        // const terminal = createTerminal(terminalOptions)
        // // 显示终端
        // if (autoFocus) {
        //     terminal.show(true);
        // }else {
        //     terminal.show(false)
        // }

        // 清空终端
        if (autoClear) {
            await vscode.commands.executeCommand('workbench.action.terminal.clear');
        }

        for (let i = 0; i < commands.length; i++) {
            // options?.autoClear = true
            // 获取命令
            let cmd = commands[i]
            const command = this.$accessor.config('command-runner.autoAppendSelectedFiles')
                ? cmd + ' ' + this.$files.join(' ')
                : cmd;

            
            await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
            // 写入命令
            let theFinalCmd = await this.resolve(command, predefined)


            try {
                if (!theFinalCmd) {
                    continue
                }
                let name = terminalOptions.name+'-'+String(i+1)+':'+theFinalCmd.substring(0,10)
                // let cur = {terminalOptions...}
                // cur.name = name
                terminalOptions.name = name
                await this.waitTerminalForExit(null,theFinalCmd, terminalOptions)
            } catch (e) {
                console.error(e)
            }
        }

        // 输出命令信息
        // console.log('--> Run Command:', command);
    }
    // public async waitForTerminalStateChange(terminal0: any, command, terminalOptions) {
    //     const terminal = terminal0 || createTerminal(terminalOptions);
    //     // terminal.show();
    //     terminal.sendText(command, true);

    //     return new Promise((resolve, reject) => {
    //         // vscode.window.onDidOpenTerminal()
    //         // debugger;
    //         debugger;
    //         const  dd = vscode.window.onDidWriteTerminalData( (e) => {
    //             debugger;
    //             dd.dispose()
    //             resolve(e);
    //         })

            

    //     });
    // }
    // it can wait for command exit;
    public async waitTerminalForExit(
        terminal0: any,
        command: string,
        terminalOptions: any,
        // shellPath?: string,
        // name?: string,
        // location?: vscode.TerminalLocation
    ): Promise<vscode.TerminalExitStatus> {
        const terminal = terminal0 || createTerminal(terminalOptions);
        // terminal.show();
        terminal.show(true);
        terminal.sendText(command, false);
        terminal.sendText("; exit");

        return new Promise((resolve, reject) => {

            const disposeToken = vscode.window.onDidCloseTerminal(
                async (closedTerminal) => {
                    if (closedTerminal === terminal) {
                        disposeToken.dispose();
                        if (terminal.exitStatus !== undefined) {
                            resolve(terminal.exitStatus);
                        } else {
                            reject("Terminal exited with undefined status");
                        }
                    }
                }
            );
        });
    }
    /* 执行命令 */
    public async execute(cmd: string, options?: TerminalOptions) {
        const { autoClear, autoFocus, ...terminalOptions }: TerminalOptions = {
            ...this.$accessor.config('command-runner.terminal'),
            ...options,
            hideFromUser: false,
        };
        // debugger;
        // 创建终端
        const terminal = createTerminal(terminalOptions);

        // 显示终端
        if (autoFocus) {
            terminal.show(true);
        }else {
            terminal.show(false);
        }

        // 清空终端
        if (autoClear) {
            await vscode.commands.executeCommand('workbench.action.terminal.clear');
        }

        // 预设数据
        const predefined = {
            selectedFile: this.$files[0] || '',
            selectedFiles: this.$files.join(' '),
        };

        // 获取命令
        const command = this.$accessor.config('command-runner.autoAppendSelectedFiles')
            ? cmd + ' ' + this.$files.join(' ')
            : cmd;

        // 写入命令
        terminal.sendText(await this.resolve(command, predefined));

        // 输出命令信息
        // console.log('--> Run Command:', command);
    }

    /* 执行选择的文字 */
    public async executeSelectText(options?: TerminalOptions) {
        await this.execute(this.$accessor.variable('selectedTextSection'), options);
    }
}
