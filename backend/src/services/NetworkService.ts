import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as ping from 'ping';

const execPromise = promisify(exec);

export class NetworkService {
  /**
   * Teste de Ping Simples
   */
  static async checkStatus(target: string) {
    // Usamos 'as any' porque a tipagem da biblioteca ping às vezes entra em conflito com ESM
    const res = await (ping as any).promise.probe(target, {
      timeout: 2,
    });

    return {
      host: target,
      alive: res.alive,
      latency: res.avg !== 'unknown' ? parseFloat(res.avg) : null,
      timestamp: new Date()
    };
  }

  /**
   * Traceroute usando o comando nativo do Windows
   */
  static async runTraceroute(target: string) {
    try {
      // O 'process' global já fornece o platform se os @types/node estiverem ativos
      const isWin = process.platform === 'win32';
      const command = isWin ? `tracert ${target}` : `traceroute ${target}`;
      
      const { stdout } = await execPromise(command);
      return stdout;
    } catch (error) {
      return `Erro ao executar traceroute: ${error}`;
    }
  }
}