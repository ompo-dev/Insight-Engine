import {
  attachSession,
  closeSession,
  listSessions,
  openSession,
  resizeSession,
  sendSignal,
  subscribeOutput,
  writeInput,
} from "@workspace/terminal-runtime";
import type {
  TerminalOutputEvent,
  TerminalSessionShell,
  TerminalSessionSnapshot,
  TerminalSignal,
} from "@workspace/runtime-core";

export type { TerminalSessionShell } from "@workspace/runtime-core";

export interface TerminalCommandResult {
  session: TerminalSessionSnapshot;
  output: string;
  exitCode: number | null;
  workingDirectory: string;
}

const COMMAND_IDLE_MS = 350;
const COMMAND_TIMEOUT_MS = 120_000;

function buildEnterKey(shell: TerminalSessionShell) {
  return shell === "bash" || shell === "zsh" ? "\n" : "\r\n";
}

function sliceDelta(previousOutput: string, nextOutput: string) {
  if (!previousOutput.length) return nextOutput.trim();
  return nextOutput.slice(previousOutput.length).trim();
}

export function getTerminalSessionSnapshot(projectId: string, sessionId: string) {
  return attachSession(projectId, sessionId);
}

export function listTerminalSessions(projectId?: string) {
  return listSessions(projectId);
}

export async function createTerminalSession(input: {
  projectId: string;
  shell?: TerminalSessionShell;
  workingDirectory?: string;
  cols?: number;
  rows?: number;
  initialOutput?: string;
}) {
  return openSession(input);
}

export function writeToTerminalSession(input: {
  projectId: string;
  sessionId: string;
  data: string;
}) {
  return writeInput(input);
}

export function resizeTerminalSession(input: {
  projectId: string;
  sessionId: string;
  cols: number;
  rows: number;
}) {
  return resizeSession(input);
}

export function signalTerminalSession(input: {
  projectId: string;
  sessionId: string;
  signal: TerminalSignal;
}) {
  return sendSignal(input);
}

export function subscribeTerminalSessionOutput(
  input: { projectId: string; sessionId: string },
  subscriber: (event: TerminalOutputEvent) => void,
) {
  return subscribeOutput(input, subscriber);
}

export function closeTerminalSession(projectId: string, sessionId: string) {
  return closeSession(projectId, sessionId);
}

export async function runCommandInTerminalSession(input: {
  projectId: string;
  sessionId: string;
  command: string;
}) {
  const session = attachSession(input.projectId, input.sessionId);
  const normalizedCommand = input.command.trim();
  if (!normalizedCommand) {
    throw new Error("Command is required.");
  }

  const previousOutput = session.output;
  const commandInput = `${normalizedCommand}${buildEnterKey(session.shell)}`;

  return await new Promise<TerminalCommandResult>((resolve, reject) => {
    let settled = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      settled = true;
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      clearTimeout(timeout);
      unsubscribe();
    };

    const finish = () => {
      if (settled) return;
      const nextSession = attachSession(input.projectId, input.sessionId);
      cleanup();
      resolve({
        session: nextSession,
        output: sliceDelta(previousOutput, nextSession.output),
        exitCode: nextSession.exitCode,
        workingDirectory: nextSession.workingDirectory,
      });
    };

    const unsubscribe = subscribeOutput(
      { projectId: input.projectId, sessionId: input.sessionId },
      () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        silenceTimer = setTimeout(finish, COMMAND_IDLE_MS);
      },
    );

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Comando excedeu o limite de 120 segundos."));
    }, COMMAND_TIMEOUT_MS);

    try {
      writeInput({
        projectId: input.projectId,
        sessionId: input.sessionId,
        data: commandInput,
      });

      silenceTimer = setTimeout(finish, COMMAND_IDLE_MS);
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error("Falha ao enviar comando ao terminal."));
    }
  });
}
