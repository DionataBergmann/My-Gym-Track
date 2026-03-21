require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normalizeBrazilPhoneDigits(input) {
  const digits = String(input).replace(/\D/g, '');
  if (!digits.startsWith('55') || digits.length < 12) {
    return digits;
  }
  if (digits.length === 12 && /^55\d{10}$/.test(digits)) {
    const afterDdd = digits.slice(4);
    if (afterDdd.length === 8 && !afterDdd.startsWith('9')) {
      return `${digits.slice(0, 4)}9${afterDdd}`;
    }
  }
  return digits;
}

function legacyBrazilMobileWithoutNine(canonical) {
  if (canonical.length !== 13 || !canonical.startsWith('55')) {
    return null;
  }
  const afterDdd = canonical.slice(4);
  if (afterDdd.length === 9 && afterDdd.startsWith('9')) {
    return `${canonical.slice(0, 4)}${afterDdd.slice(1)}`;
  }
  return null;
}

const plans = [
  {
    name: 'Upper A',
    muscleGroup: 'upper-a',
    exercises: [
      { exerciseName: 'Supino inclinado halter', orderIndex: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
      { exerciseName: 'Puxada na frente (aberta)', orderIndex: 2, targetSets: 4, targetReps: 12, restSeconds: 90 },
      { exerciseName: 'Supino reto', orderIndex: 3, targetSets: 3, targetReps: 12, restSeconds: 90 },
      { exerciseName: 'Remada máquina', orderIndex: 4, targetSets: 3, targetReps: 12, restSeconds: 75 },
      { exerciseName: 'Elevação lateral', orderIndex: 5, targetSets: 4, targetReps: 15, restSeconds: 60 },
      { exerciseName: 'Tríceps corda', orderIndex: 6, targetSets: 3, targetReps: 12, restSeconds: 60 },
      { exerciseName: 'Rosca simultânea (halter)', orderIndex: 7, targetSets: 3, targetReps: 12, restSeconds: 60 },
    ],
  },
  {
    name: 'Upper B',
    muscleGroup: 'upper-b',
    exercises: [
      { exerciseName: 'Barra fixa', orderIndex: 1, targetSets: 4, targetReps: 10, restSeconds: 90 },
      { exerciseName: 'Desenvolvimento halter', orderIndex: 2, targetSets: 3, targetReps: 10, restSeconds: 90 },
      { exerciseName: 'Remada baixa', orderIndex: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
      { exerciseName: 'Crucifixo máquina', orderIndex: 4, targetSets: 3, targetReps: 12, restSeconds: 75 },
      { exerciseName: 'Elevação lateral', orderIndex: 5, targetSets: 4, targetReps: 15, restSeconds: 60 },
      { exerciseName: 'Crucifixo inverso', orderIndex: 6, targetSets: 4, targetReps: 15, restSeconds: 60 },
      { exerciseName: 'Tríceps testa', orderIndex: 7, targetSets: 3, targetReps: 12, restSeconds: 60 },
      { exerciseName: 'Rosca alternada', orderIndex: 8, targetSets: 3, targetReps: 12, restSeconds: 60 },
      { exerciseName: 'Rosca martelo', orderIndex: 9, targetSets: 3, targetReps: 12, restSeconds: 60 },
    ],
  },
  {
    name: 'Lower A',
    muscleGroup: 'lower-a',
    exercises: [
      { exerciseName: 'Agachamento livre', orderIndex: 1, targetSets: 4, targetReps: 10, restSeconds: 120 },
      { exerciseName: 'Leg press', orderIndex: 2, targetSets: 3, targetReps: 12, restSeconds: 90 },
      { exerciseName: 'Cadeira extensora', orderIndex: 3, targetSets: 3, targetReps: 15, restSeconds: 60 },
      { exerciseName: 'Mesa flexora', orderIndex: 4, targetSets: 3, targetReps: 12, restSeconds: 75 },
      { exerciseName: 'Panturrilha em pé', orderIndex: 5, targetSets: 4, targetReps: 15, restSeconds: 45 },
      { exerciseName: 'Abdômen', orderIndex: 6, targetSets: 3, targetReps: 15, restSeconds: 45 },
    ],
  },
  {
    name: 'Lower B',
    muscleGroup: 'lower-b',
    exercises: [
      { exerciseName: 'Levantamento terra', orderIndex: 1, targetSets: 4, targetReps: 8, restSeconds: 120 },
      { exerciseName: 'Agachamento búlgaro', orderIndex: 2, targetSets: 3, targetReps: 12, restSeconds: 90 },
      { exerciseName: 'Mesa flexora', orderIndex: 3, targetSets: 3, targetReps: 12, restSeconds: 75 },
      { exerciseName: 'Extensora (leve)', orderIndex: 4, targetSets: 3, targetReps: 15, restSeconds: 60 },
      { exerciseName: 'Panturrilha sentado', orderIndex: 5, targetSets: 4, targetReps: 15, restSeconds: 45 },
      { exerciseName: 'Abdômen', orderIndex: 6, targetSets: 3, targetReps: 15, restSeconds: 45 },
    ],
  },
];

async function main() {
  const raw = process.env.SEED_USER_PHONE || '5553984332609';
  const userPhone = normalizeBrazilPhoneDigits(raw);
  const legacy = legacyBrazilMobileWithoutNine(userPhone);

  /** Idempotent: safe to run on every deploy (e.g. Render Free has no Shell). */
  let user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user && legacy) {
    user = await prisma.user.findUnique({ where: { phone: legacy } });
  }
  if (!user) {
    user = await prisma.user.create({ data: { phone: userPhone } });
    console.log(`Created user ${userPhone}`);
  }

  let created = 0;
  for (const plan of plans) {
    const existing = await prisma.workoutPlan.findFirst({
      where: { userId: user.id, muscleGroup: plan.muscleGroup },
    });
    if (existing) {
      continue;
    }
    await prisma.workoutPlan.create({
      data: {
        userId: user.id,
        name: plan.name,
        muscleGroup: plan.muscleGroup,
        exercises: {
          create: plan.exercises,
        },
      },
    });
    created += 1;
  }

  if (created === 0) {
    console.log(`Seed skipped (plans already exist) for user phone: ${userPhone}`);
  } else {
    console.log(`Seed completed: +${created} plan(s) for user phone: ${userPhone}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
