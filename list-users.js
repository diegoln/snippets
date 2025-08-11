const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { 
        email: true, 
        name: true,
        id: true,
        jobTitle: true
      }
    });
    
    console.log('Users in database:');
    users.forEach(u => {
      console.log(`- ${u.email} (${u.name || 'no name'}) - ID: ${u.id} - Job: ${u.jobTitle || 'none'}`);
    });
    
    console.log(`\nTotal users: ${users.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();