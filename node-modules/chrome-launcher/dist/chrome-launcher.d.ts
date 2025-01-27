/// <reference types="node" />
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { ChildProcess } from 'child_process';
declare type JSONLike = {
    [property: string]: JSONLike;
} | readonly JSONLike[] | string | number | boolean | null;
export interface Options {
    startingUrl?: string;
    chromeFlags?: Array<string>;
    prefs?: Record<string, JSONLike>;
    port?: number;
    handleSIGINT?: boolean;
    chromePath?: string;
    userDataDir?: string | boolean;
    logLevel?: 'verbose' | 'info' | 'error' | 'warn' | 'silent';
    ignoreDefaultFlags?: boolean;
    connectionPollInterval?: number;
    maxConnectionRetries?: number;
    envVars?: {
        [key: string]: string | undefined;
    };
}
export interface LaunchedChrome {
    pid: number;
    port: number;
    process: ChildProcess;
    kill: () => void;
}
export interface ModuleOverrides {
    fs?: typeof fs;
    spawn?: typeof childProcess.spawn;
}
declare function launch(opts?: Options): Promise<LaunchedChrome>;
/** Returns Chrome installation path that chrome-launcher will launch by default. */
declare function getChromePath(): string;
declare function killAll(): Array<Error>;
declare class Launcher {
    private opts;
    private tmpDirandPidFileReady;
    private pidFile;
    private startingUrl;
    private outFile?;
    private errFile?;
    private chromePath?;
    private ignoreDefaultFlags?;
    private chromeFlags;
    private prefs;
    private requestedPort?;
    private connectionPollInterval;
    private maxConnectionRetries;
    private fs;
    private spawn;
    private useDefaultProfile;
    private envVars;
    chromeProcess?: childProcess.ChildProcess;
    userDataDir?: string;
    port?: number;
    pid?: number;
    constructor(opts?: Options, moduleOverrides?: ModuleOverrides);
    private get flags();
    static defaultFlags(): string[];
    /** Returns the highest priority chrome installation. */
    static getFirstInstallation(): string | undefined;
    /** Returns all available chrome installations in decreasing priority order. */
    static getInstallations(): string[];
    makeTmpDir(): string;
    prepare(): void;
    private setBrowserPrefs;
    launch(): Promise<void>;
    private spawnProcess;
    private cleanup;
    private isDebuggerReady;
    waitUntilReady(): Promise<void>;
    kill(): void;
    destroyTmp(): void;
}
export default Launcher;
export { Launcher, launch, killAll, getChromePath };
