const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
  const userPhone = process.env.SEED_USER_PHONE || '5553984332609';

  const user = await prisma.user.upsert({
    where: { phone: userPhone },
    update: {},
    create: { phone: userPhone },
  });

  await prisma.workoutPlan.deleteMany({
    where: {
      userId: user.id,
      muscleGroup: { in: plans.map((plan) => plan.muscleGroup) },
    },
  });

  for (const plan of plans) {
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
  }

  console.log(`Seed completed for user phone: ${userPhone}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
