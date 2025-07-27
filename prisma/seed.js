const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with mock users...');

  // Create mock users that match our authentication system
  const users = [
    {
      id: '1',
      name: 'John Developer',
      email: 'john@example.com',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: '2',
      name: 'Sarah Engineer',
      email: 'sarah@example.com',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b9f2d30c?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: '3',
      name: 'Alex Designer',
      email: 'alex@example.com',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user
    });
    console.log(`✅ Created user: ${user.name}`);
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });