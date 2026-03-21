import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WorkoutService } from '../workout/workout.service';

const MAX_REST_SECONDS = 900;

type TwilioOutboundConfig =
  | { ok: true; accountSid: string; authToken: string; fromNumber: string }
  | { ok: false };

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  /** Tracks last command so we can explain n vs l (n does not advance set count) */
  private readonly lastCommandByPhone = new Map<string, string>();

  constructor(
    private readonly workoutService: WorkoutService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getTwilioOutboundConfig(): TwilioOutboundConfig {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    const fromNumber = this.configService.get<string>(
      'TWILIO_WHATSAPP_SANDBOX_NUMBER',
    )?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      return { ok: false };
    }
    return { ok: true, accountSid, authToken, fromNumber };
  }

  /** Maps friendly names (help/examples) to seeded muscleGroup slugs */
  private readonly muscleGroupAliases: Record<string, string> = {
    chest: 'upper-a',
    peito: 'upper-a',
    'upper-a': 'upper-a',
    uppera: 'upper-a',
    'upper-b': 'upper-b',
    upperb: 'upper-b',
    back: 'upper-b',
    costas: 'upper-b',
    legs: 'lower-a',
    pernas: 'lower-a',
    perna: 'lower-a',
    'lower-a': 'lower-a',
    lowera: 'lower-a',
    'lower-b': 'lower-b',
    lowerb: 'lower-b',
  };

  private resolveMuscleGroup(raw: string) {
    const key = raw.trim().toLowerCase();
    return this.muscleGroupAliases[key] ?? key;
  }

  /** Expand one-letter shortcuts so you do not need to type full words */
  private expandShortcuts(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === 'n' || t === 'nx') {
      return 'next';
    }
    if (t === 'f' || t === 'done') {
      return 'finish';
    }
    if (t === 'h' || t === '?' || t === 'ajuda') {
      return 'help';
    }
    if (t === 'm' || t === 'menu') {
      return 'menu';
    }
    if (t === 'p' || t === 'phone') {
      return 'phone';
    }
    if (/^l\s+/.test(t)) {
      return `log ${t.replace(/^l\s+/, '')}`;
    }
    return text.trim();
  }

  /** Atalhos em linhas separadas (evita confundir "l" com "1") */
  private quickHintBlock() {
    return [
      '────────',
      'l 10x60 → registra e avança série (reps×kg)',
      'n → ver de novo a série atual (não aumenta 1→2)',
      'f → encerra treino',
      'm → menu',
    ].join('\n');
  }

  private helpMessage() {
    return [
      '1 msg por vez. Série 1→2→3: sempre com l reps×kg.',
      'start upper-a · l 10x40 · n · f · m',
      '',
      'Dias: upper-a, upper-b, lower-a, lower-b',
      'Ex.: start peito',
      '',
      'Timer: após o l, no fim do descanso mando o card completo da próxima série (Twilio).',
    ].join('\n');
  }

  private menuMessage() {
    return [
      'start upper-a — começar',
      '',
      this.quickHintBlock(),
    ].join('\n');
  }

  private formatExerciseCard(opts: {
    muscleGroup?: string;
    exerciseName: string;
    setNumber: number;
    targetSets: number;
    targetReps: number;
    restSeconds: number;
    includeHints?: boolean;
    /** false = omit rest line (caller shows it separately, e.g. after log) */
    showRestLine?: boolean;
  }) {
    const {
      muscleGroup,
      exerciseName,
      setNumber,
      targetSets,
      targetReps,
      restSeconds,
      includeHints = true,
      showRestLine = true,
    } = opts;

    const lines: string[] = [];
    if (muscleGroup) {
      lines.push(`Treino: ${muscleGroup}`, '');
    }
    lines.push(
      exerciseName,
      '',
      `Série ${setNumber} de ${targetSets}`,
      `Meta: ${targetReps} reps`,
    );
    if (showRestLine) {
      lines.push(`Descanso depois: ${restSeconds} s`);
      lines.push('(Próxima série: l reps×kg após treinar)');
    }
    if (includeHints) {
      lines.push('', this.quickHintBlock());
    }
    return lines.join('\n');
  }

  private formatNextExerciseResponse(next: Awaited<ReturnType<WorkoutService['getNextExercise']>>) {
    if (!next.nextExercise || !next.nextSetNumber) {
      return 'Fim dos exercícios.\n\nf → encerrar treino';
    }

    const ex = next.nextExercise;
    return this.formatExerciseCard({
      exerciseName: ex.exerciseName,
      setNumber: next.nextSetNumber,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      restSeconds: ex.restSeconds,
      includeHints: true,
    });
  }

  async clearPendingRestPing(phone: string) {
    await this.prisma.pendingRestPing.deleteMany({ where: { userPhone: phone } });
  }

  /** Full “next set” card sent when rest ends (Twilio outbound). */
  private async buildRestEndedOutboundBody(phone: string): Promise<string> {
    try {
      const next = await this.workoutService.getNextExercise(phone);
      const header =
        '⏱ Descanso encerrado — próxima série:\n';

      if (!next.nextExercise || !next.nextSetNumber) {
        return `${header}\nFim dos exercícios deste treino.\n\nf → encerrar`;
      }

      const ex = next.nextExercise;
      const card = this.formatExerciseCard({
        exerciseName: ex.exerciseName,
        setNumber: next.nextSetNumber,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        restSeconds: ex.restSeconds,
        includeHints: true,
        showRestLine: true,
      });
      return `${header}\n${card}`;
    } catch {
      return [
        '⏱ Descanso encerrado.',
        'Sem sessão ativa ou erro ao buscar a série.',
        'Envie n ou continue com l reps×kg.',
      ].join('\n');
    }
  }

  /**
   * Queues rest ping in SQLite; {@link flushDueRestPings} sends via Twilio.
   * @returns true if queued (Twilio env OK), false otherwise.
   */
  async scheduleRestReminder(phone: string, restSeconds: number): Promise<boolean> {
    await this.clearPendingRestPing(phone);
    const cfg = this.getTwilioOutboundConfig();
    if (!cfg.ok) {
      this.logger.warn(
        'Rest ping not queued: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_SANDBOX_NUMBER (ex. +14155238886).',
      );
      return false;
    }

    const seconds = Math.min(Math.max(1, restSeconds), MAX_REST_SECONDS);
    const sendAt = new Date(Date.now() + seconds * 1000);

    await this.prisma.pendingRestPing.upsert({
      where: { userPhone: phone },
      create: { userPhone: phone, sendAt },
      update: { sendAt },
    });

    this.logger.log(
      `Rest ping queued for ${sendAt.toISOString()} (~${seconds}s) ***${phone.slice(-4)}`,
    );
    return true;
  }

  /** Called on an interval: send due pings and remove rows (survives server restarts). */
  async flushDueRestPings() {
    const cfg = this.getTwilioOutboundConfig();
    if (!cfg.ok) {
      return;
    }

    const now = new Date();
    const due = await this.prisma.pendingRestPing.findMany({
      where: { sendAt: { lte: now } },
      orderBy: { sendAt: 'asc' },
      take: 25,
    });
    if (due.length === 0) {
      return;
    }

    const ids = due.map((row: { id: string }) => row.id);
    await this.prisma.pendingRestPing.deleteMany({
      where: { id: { in: ids } },
    });

    for (const row of due) {
      try {
        this.logger.log(`Rest ping sending ***${row.userPhone.slice(-4)}`);
        const body = await this.buildRestEndedOutboundBody(row.userPhone);
        await this.sendOutboundWhatsApp(row.userPhone, body);
      } catch (err) {
        this.logger.error(
          `Rest ping failed ***${row.userPhone.slice(-4)}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }

  private async sendOutboundWhatsApp(toDigits: string, body: string) {
    const cfg = this.getTwilioOutboundConfig();
    if (!cfg.ok) {
      return;
    }

    const { accountSid, authToken, fromNumber } = cfg;

    const from = fromNumber.startsWith('whatsapp:')
      ? fromNumber
      : `whatsapp:${fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`}`;
    const to = `whatsapp:+${toDigits.replace(/^\+/, '')}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', from);
    params.append('To', to);
    params.append('Body', body.slice(0, 1600));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (err) {
      this.logger.error(
        `Twilio outbound fetch error → ***${toDigits.slice(-4)}`,
        err instanceof Error ? err.stack : err,
      );
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(
        `Twilio outbound failed (To ${to}) status=${response.status}: ${errText}`,
      );
    } else {
      this.logger.log(`Twilio outbound OK → ${to} ***${toDigits.slice(-4)}`);
    }
  }

  async processIncomingText(fromPhone: string, text: string) {
    const expanded = this.expandShortcuts(text);
    const normalized = expanded.trim().toLowerCase();

    if (!normalized || normalized === 'help') {
      return this.helpMessage();
    }

    if (normalized === 'menu') {
      return this.menuMessage();
    }

    if (normalized === 'phone' || normalized === 'whoami') {
      return `SEED_USER_PHONE=${fromPhone}\n(npm run seed)`;
    }

    if (normalized.startsWith('start ')) {
      await this.clearPendingRestPing(fromPhone);
      const rawGroup = normalized.replace('start ', '').trim();
      const muscleGroup = this.resolveMuscleGroup(rawGroup);
      const session = await this.workoutService.startSession({
        userPhone: fromPhone,
        muscleGroup,
      });
      const firstExercise = session.exercises[0];
      if (!firstExercise) {
        return `Treino ${muscleGroup} sem exercícios no plano.`;
      }
      this.lastCommandByPhone.set(fromPhone, 'start');
      return this.formatExerciseCard({
        muscleGroup,
        exerciseName: firstExercise.exerciseName,
        setNumber: 1,
        targetSets: firstExercise.targetSets,
        targetReps: firstExercise.targetReps,
        restSeconds: firstExercise.restSeconds,
        includeHints: true,
      });
    }

    if (normalized === 'next') {
      // Do not clear rest timer: user often sends n during rest to re-read the card;
      // clearing would cancel the Twilio ping at the end of rest.
      const prev = this.lastCommandByPhone.get(fromPhone);
      const next = await this.workoutService.getNextExercise(fromPhone);

      if (prev === 'next') {
        return [
          'n não aumenta a série (continua 1/4 até você registrar).',
          'Depois de fazer a série: l reps×kg',
          'Ex: l 10x40',
          '',
          this.quickHintBlock(),
        ].join('\n');
      }

      this.lastCommandByPhone.set(fromPhone, 'next');

      if (
        prev === 'start' &&
        next.nextExercise &&
        next.nextSetNumber
      ) {
        const ex = next.nextExercise;
        return [
          `${ex.exerciseName}`,
          `Série ${next.nextSetNumber} de ${ex.targetSets} — igual ao início do treino.`,
          'Para virar 2/4, 3/4…: envie l depois de executar.',
          '',
          this.quickHintBlock(),
        ].join('\n');
      }

      return this.formatNextExerciseResponse(next);
    }

    if (normalized === 'finish') {
      await this.clearPendingRestPing(fromPhone);
      this.lastCommandByPhone.delete(fromPhone);
      await this.workoutService.finishActiveSessionByPhone(fromPhone);
      return 'Treino encerrado. Até a próxima.';
    }

    if (normalized.startsWith('log ')) {
      const payload = normalized.replace('log ', '').trim();
      // reps×kg (e.g. 10x40 = 10 reps @ 40 kg). Weight may use comma/period.
      const match = payload.match(/^(\d+)x(\d+(?:[.,]\d+)?)$/);
      if (!match) {
        return 'Formato: l 10x40 (reps×kg, ex.: 12x32,5)';
      }

      const reps = Number(match[1]);
      const weightKg = Number(match[2].replace(',', '.'));
      const result = await this.workoutService.logSetByPhone(fromPhone, weightKg, reps);
      this.lastCommandByPhone.set(fromPhone, 'log');

      const lines = [
        `✓ Registrado: ${weightKg} kg × ${reps} reps`,
        '',
      ];

      if (result.next.nextExercise && result.next.nextSetNumber) {
        const ex = result.next.nextExercise;
        const rest =
          result.set.restSeconds ?? ex.restSeconds ?? 90;
        // Resumo só (evita repetir o mesmo card do n); o card completo vai no fim do descanso.
        lines.push(
          `Próxima: ${ex.exerciseName}`,
          `Série ${result.next.nextSetNumber} de ${ex.targetSets} · meta ${ex.targetReps} reps`,
          '',
          `⏱ Descanso ${rest} s — quando acabar, mando o trecho completo da série.`,
          '',
          this.quickHintBlock(),
        );
        const queued = await this.scheduleRestReminder(fromPhone, rest);
        if (!queued) {
          lines.push(
            '',
            '⚠️ Aviso automático desligado: no servidor, preencha TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_SANDBOX_NUMBER (ex.: +14155238886, número “From” do sandbox). Depois rode de novo o deploy / reinicie a API.',
          );
        }
      } else {
        lines.push(
          this.formatNextExerciseResponse(result.next),
          '',
          this.quickHintBlock(),
        );
      }

      return lines.join('\n');
    }

    return `? → ${this.helpMessage()}`;
  }
}
